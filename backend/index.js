require('dotenv').config();
const express = require('express');
const supabase = require('./supabaseClient');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Groq = require('groq-sdk');
const {
  isInAppointmentFlow,
  processAppointmentStep,
  shouldStartAppointment,
  startAppointmentFlow
} = require('./appointmentBooking');
const jwt = require('jsonwebtoken');
const { auth } = require('./auth');
const { toNodeHandler } = require("better-auth/node");
const rateLimit = require('express-rate-limit');


const app = express();
const PORT = process.env.PORT || 5010;

// Trust the first reverse proxy in front (Nginx, and Cloudflare once enabled)
// so rate-limit keys off the real client IP from X-Forwarded-For instead of
// the proxy's IP — otherwise every user looks like the same IP and one
// limiter bucket covers everyone.
app.set('trust proxy', 1);

// Middleware
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:5173",
  "https://britsyncai.com",
  "capacitor://localhost",
  "http://localhost",
  "https://localhost",
];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no Origin header (native apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true
}));

// ─── Better Auth Integration ─────────────────────────────────────────────
// IMPORTANT: Must be mounted BEFORE express.json() — Better-Auth reads the
// raw request stream, and express.json() would consume the body first.
app.all("/api/auth/*", toNodeHandler(auth));

// Body parser AFTER Better-Auth
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure Uploads Directory Exists
if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads');
}

// GROQ Setup
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Helper to get session in routes
async function getSession(req) {
  return await auth.api.getSession({
    headers: req.headers
  });
}

// ─── Rate Limit — /api/groq ────────────────────────────────────────────────
// Server-side guard against direct hits that bypass the client-side limiter.
// Matches the client-side account-wide cap (25 req/min) with slight headroom
// below Groq's free-tier 30 RPM so we trip first and the OpenRouter fallback
// can absorb overflow cleanly. Keyed by IP.
const groqRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: '⏱️ Britsee is handling a lot of traffic right now. Please wait a minute and try again.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
});

// Daily cap — stops a determined attacker from sustaining abuse for hours.
// 800/day sits ~20% below Groq's 1000 RPD free-tier ceiling.
const groqDailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 800,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: '⏱️ Daily request limit reached. Service will resume tomorrow.',
      code: 'DAILY_LIMIT_EXCEEDED',
    },
  },
});

// ─── Groq Proxy Route (Production) ─────────────────────────────────────────
// This replaces the Vite dev proxy for production deployments
app.post('/api/groq', groqRateLimiter, groqDailyLimiter, async (req, res) => {
  try {
    const { model, messages, temperature, max_tokens } = req.body;
    let modelToUse = model || 'llama-3.3-70b-versatile';

    const hasImages = messages.some(m => {
      const content = m.content;
      if (Array.isArray(content)) {
        return content.some(c => c.type === 'image_url');
      }
      return false;
    });

    if (hasImages) {
      const visionModels = ['llama-3.2-90b-vision-preview', 'llama-3.2-11b-vision-preview', 'llama-3.2-90b-vision'];
      if (!visionModels.includes(modelToUse)) {
        modelToUse = 'llama-3.2-90b-vision-preview';
      }
    }

    const response = await groq.chat.completions.create({
      model: modelToUse,
      messages: messages,
      temperature: temperature ?? 0.7,
      max_tokens: max_tokens,
    });

    res.json(response);
  } catch (err) {
    console.error('Groq Proxy Error:', err);

    const errorMessage = err.message || 'Groq API Error';
    if (errorMessage.includes('does not support image input') || errorMessage.includes('clipboard')) {
      return res.status(400).json({
        error: {
          message: 'Model does not support image input. Please select a vision model (llama-3.2-90b-vision-preview) in Settings.',
          code: 'MODEL_DOES_NOT_SUPPORT_VISION'
        }
      });
    }

    res.status(err.status || 500).json({
      error: {
        message: errorMessage,
        status: err.status
      }
    });
  }
});

// ─── Health Check ─────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Britsee Strategic Engine'
  });
});

// ─── Database Connection ──────────────────────────────────────────────────
// Team Chat is now fully Supabase-based (tables: teams, team_members,
// team_memory). The backend only needs a health probe.

let isDbConnected = false;

const connectDB = async () => {
  try {
    // Probe the `teams` table — present in every current deployment.
    // Any auth/config problem surfaces here before routes start failing.
    const { error } = await supabase
      .from('teams')
      .select('id', { count: 'exact', head: true });
    if (error) throw error;
    isDbConnected = true;
    console.log('\n--- Supabase Connection Status ---');
    console.log('✅ Status: CONNECTED');
    console.log(`🔗 URL: ${process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL}`);
    console.log('----------------------------------\n');
  } catch (err) {
    isDbConnected = false;
    console.error('\n--- Supabase Connection Status ---');
    console.log('❌ Status: FAILED');
    console.log(`⚠️  Error: ${err.message}`);
    console.log('💡 Tip: Verify SUPABASE_URL/SUPABASE_KEY and run backend/sql/fix_all_schema.sql.');
    console.log('----------------------------------\n');
  }
};

// Lazy connect database for serverless
if (!process.env.VERCEL) {
  connectDB();
}

// Middleware to ensure DB connection
app.use(async (req, res, next) => {
  if (!isDbConnected) {
    await connectDB();
  }
  next();
});

// ─── AI Assistant (Britsee) Chat Endpoint ───────────────────────────────────

const WIDGET_SYSTEM_PROMPT = `
You are **Britsee**, the AI assistant built by **BritSync**. You are a full-capability AI — not a sales rep, not a receptionist.

## CRITICAL RULES
1. **NEVER DEFLECT.** If asked to create, build, write, design, or generate anything (website, email, plan, code, copy), produce the finished output yourself right now. NEVER say "our team can help", "schedule a call", "book a consultation", or "contact us" UNLESS the user explicitly asked to book a call.
2. **BUILD WHEN ASKED.** "Create a website" = output complete HTML/CSS in a code block. "Write me an email" = write the finished email. "Give me a plan" = produce the plan.
3. **APPOINTMENT BOOKING IS OPT-IN ONLY.** Only mention booking a call if the user explicitly used words like "book", "schedule", "appointment", "meeting", "call me", or "discovery call". Otherwise just answer their actual question.
4. **TONE:** Refined British English. Concise. Confident. Helpful.
5. **NO SALES PITCHES.** Don't list "our services". Don't end every reply asking to schedule a call. Just answer.

## IDENTITY
- Name: Britsee
- Maker: BritSync
- If asked what model you are: "I'm Britsee, by BritSync." Never name external LLMs.

You are a genuine AI assistant — answer questions, write code, create content, solve problems. Treat each request on its own merits.
`;

async function generateChatResponse(chatInput, sessionId) {
  try {
    // 1. Check if we're in a booking flow
    if (isInAppointmentFlow(sessionId)) {
      const response = await processAppointmentStep(sessionId, chatInput);
      return { success: true, response, state: 'in-flow' };
    }

    // 2. Check if the user wants to start a booking
    if (shouldStartAppointment(chatInput)) {
      const startResult = await startAppointmentFlow(sessionId);

      const completion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: WIDGET_SYSTEM_PROMPT },
          { role: 'system', content: `[CONTEXT] Use the following instruction to start the booking flow: ${startResult.aiPrompt}` },
          { role: 'user', content: chatInput }
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
      });

      return {
        success: true,
        response: completion.choices[0].message.content,
        state: 'started'
      };
    }

    // 3. Normal business query
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: WIDGET_SYSTEM_PROMPT },
        { role: 'user', content: chatInput }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
    });

    return {
      success: true,
      response: completion.choices[0].message.content
    };

  } catch (err) {
    console.error('generateChatResponse Error:', err);
    return {
      success: false,
      response: "I'm having a momentary issue. Please try again! 🔄"
    };
  }
}

app.post('/api/bot/chat', async (req, res) => {
  try {
    const { chatInput, sessionId, action } = req.body;

    if (action === 'getSessionInfo' && sessionId) {
      return res.json({ success: true, inFlow: isInAppointmentFlow(sessionId) });
    }

    // Generate AI response using our code-based agent
    const result = await generateChatResponse(chatInput, sessionId);

    if (result.success) {
      res.json({
        output: result.response,
        success: true,
        state: result.state
      });
    } else {
      res.json({
        output: result.response,
        success: false
      });
    }
  } catch (err) {
    console.error('Chat Agent Error:', err);
    res.status(500).json({
      message: 'Error processing your message.',
      output: "I'm having a momentary issue. Please try again! 🔄"
    });
  }
});

// ─── Legacy Team Session Routes REMOVED ─────────────────────────────────
// Team Chat is now fully client-side via Supabase (teams / team_members /
// team_memory tables). The old PIN-based shared-room flow was replaced by
// the "chatbot inside a chatbot" model — each member has a private chat
// guided silently by the moderator's strategic memory.

// ─── LeadHunter + Sender API Proxy ──────────────────────────────────────────
const LEADHUNTER_BASE = 'https://leadhunter.uk';
const DEFAULT_LH_KEY = '1245368628749012998'; // Fallback only

app.all('/api/lh/external/*', async (req, res) => {
  try {
    const lhPath = req.path.replace('/api/lh/external', '');
    let url = `${LEADHUNTER_BASE}/api/external${lhPath}`;
    if (Object.keys(req.query).length) url += '?' + new URLSearchParams(req.query).toString();

    const apiKey = req.headers['x-api-key'] || process.env.LEADHUNTER_API_KEY || DEFAULT_LH_KEY;

    const upstream = await fetch(url, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'Accept': 'application/json',
      },
      body: (req.method !== 'GET' && req.body) ? JSON.stringify(req.body) : undefined,
    });

    const data = await upstream.json().catch(() => ({}));
    res.status(upstream.status).json(data);
  } catch (err) {
    res.status(500).json({ error: 'LeadHunter connection failed', details: err.message });
  }
});

app.all('/api/lh/standard/*', async (req, res) => {
  try {
    const lhPath = req.path.replace('/api/lh/standard', '');
    let url = `${LEADHUNTER_BASE}/api${lhPath}`;
    if (Object.keys(req.query).length) url += '?' + new URLSearchParams(req.query).toString();

    const apiKey = req.headers['x-api-key'] || process.env.LEADHUNTER_API_KEY || DEFAULT_LH_KEY;

    const upstream = await fetch(url, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'Accept': 'application/json',
      },
      body: (req.method !== 'GET' && req.body) ? JSON.stringify(req.body) : undefined,
    });

    const data = await upstream.json().catch(() => ({}));
    res.status(upstream.status).json(data);
  } catch (err) {
    res.status(500).json({ error: 'LeadHunter connection failed', details: err.message });
  }
});

app.get('/api/lh-events/:jobId', async (req, res) => {
  const { jobId } = req.params;
  const apiKey = req.headers['x-api-key'] || process.env.LEADHUNTER_API_KEY || DEFAULT_LH_KEY;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const upstream = await fetch(`${LEADHUNTER_BASE}/api/jobs/${jobId}/events`, {
      headers: { 'x-api-key': apiKey, 'Accept': 'text/event-stream' },
    });
    if (!upstream.body) return res.write('data: {"type":"error"}\n\n');
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }
    res.end();
  } catch (err) {
    res.write(`data: {"type":"error","message":"${err.message}"}\n\n`);
    res.end();
  }
});

app.all('/api/sender/*', async (req, res) => {
  try {
    let url = `${LEADHUNTER_BASE}${req.path}`;
    if (Object.keys(req.query).length) url += '?' + new URLSearchParams(req.query).toString();

    const apiKey = req.headers['x-api-key'] || process.env.LEADHUNTER_API_KEY || DEFAULT_LH_KEY;

    const upstream = await fetch(url, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'Accept': 'application/json',
      },
      body: (req.method !== 'GET' && req.body) ? JSON.stringify(req.body) : undefined,
    });
    const data = await upstream.json().catch(() => ({}));
    res.status(upstream.status).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Sender connection failed', details: err.message });
  }
});

// ─── Browser Agent Routes ──────────────────────────────────────────────────
const browserAgent = require('./browserAgent');

app.post('/api/browser/search', async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });
  try {
    const result = await browserAgent.googleSearch(query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/browser/youtube', async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });
  try {
    const result = await browserAgent.youtubeSearch(query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/browser/linkedin', async (req, res) => {
  const { query, location } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });
  try {
    const result = await browserAgent.linkedinJobSearch(query, location || 'United Kingdom');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/browser/leads', async (req, res) => {
  const { query, location } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });
  try {
    const result = await browserAgent.getLeads(query, location || 'UK');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/browser/open', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  try {
    const result = await browserAgent.openUrl(url);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/browser/close', async (req, res) => {
  try {
    await browserAgent.closeBrowser();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server - Only if not on Vercel
if (!process.env.VERCEL) {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Backend successfully running on port ${PORT}`);
    console.log(`Connected to Supabase (Britsee Business Data)`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ ERROR: Port ${PORT} is already in use.`);
      console.log(`💡 To fix this, stop any existing Britsee backend or use:`);
      console.log(`   Windows: "netstat -ano | findstr :${PORT}" then "taskkill /F /PID <PID>"`);
      console.log(`   macOS/Linux: "lsof -i :${PORT}" then "kill -9 <PID>"\n`);
      process.exit(1);
    } else {
      console.error('❌ Server startup error:', err);
      process.exit(1);
    }
  });
}

module.exports = app;
