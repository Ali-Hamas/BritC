require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
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

const app = express();
const PORT = process.env.PORT || 5010;

// GROQ Setup
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─── Groq Proxy Route (Production) ─────────────────────────────────────────
// This replaces the Vite dev proxy for production deployments
app.post('/api/groq', async (req, res) => {
  try {
    const { model, messages, temperature, max_tokens } = req.body;
    
    const response = await groq.chat.completions.create({
      model: model || 'llama-3.3-70b-versatile',
      messages: messages,
      temperature: temperature ?? 0.7,
      max_tokens: max_tokens,
    });

    res.json(response);
  } catch (err) {
    console.error('Groq Proxy Error:', err);
    res.status(err.status || 500).json({
      error: {
        message: err.message || 'Groq API Error',
        status: err.status
      }
    });
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure Uploads Directory Exists
if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads');
}

// ─── Health Check ─────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Britsee Strategic Engine'
  });
});

// ─── Database Connection ──────────────────────────────────────────────────
const teamSessionSchema = new mongoose.Schema({
  session_id: { type: String, unique: true, required: true },
  pin: { type: String, unique: true, required: true },
  title: { type: String },
  created_at: { type: Date, default: Date.now }
});

const TeamSession = mongoose.model('TeamSession', teamSessionSchema);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/britsee';
let isDbConnected = false;
const memorySessions = new Map();
const memoryMessages = new Map(); // sessionId -> Message[]

let cachedConnection = null;

const connectDB = async () => {
  if (isDbConnected && mongoose.connection.readyState === 1) return;
  
  try {
    const opts = {
      serverSelectionTimeoutMS: 5000,
      bufferCommands: false,
    };
    
    await mongoose.connect(MONGODB_URI, opts);
    isDbConnected = true;
    console.log('Connected to MongoDB (Britsee Business Data)');
  } catch (err) {
    console.error('MongoDB Atlas unavailable:', err.message);
    
    // Fallback to local MongoDB ONLY if not on Vercel
    if (!process.env.VERCEL && MONGODB_URI.includes('mongodb.net')) {
      console.log('Attempting local MongoDB fallback...');
      try {
        await mongoose.connect('mongodb://127.0.0.1:27017/britsee', {
          serverSelectionTimeoutMS: 2000,
          bufferCommands: false,
        });
        isDbConnected = true;
        console.log('Connected to Local MongoDB');
      } catch (localErr) {
        isDbConnected = false;
        console.error('Local MongoDB also unavailable:', localErr.message);
        console.warn('⚠️  Running in ZERO-CONFIG MEMORY MODE for Team Sessions. Data will not persist across restarts.');
      }
    } else {
      isDbConnected = false;
      console.warn('⚠️  Running in ZERO-CONFIG MEMORY MODE for Team Sessions. Data will not persist across restarts.');
    }
  }
};

// Lazy connect database for serverless
if (!process.env.VERCEL) {
  connectDB();
}

// Middleware to ensure DB connection for every request in serverless
app.use(async (req, res, next) => {
  if (process.env.VERCEL) {
    await connectDB();
  }
  next();
});

// ─── AI Assistant (Britsee) Chat Endpoint ───────────────────────────────────

const WIDGET_SYSTEM_PROMPT = `
You are Britsee, the AI Digital Assistant. Your primary goal is to provide helpful, concise, and expert information about our services (Web Design, SEO, AI Automation, Branding).
You represent Britsee, a premium digital agency. You are polite, professional, and sophisticated.
If the user wants to book a call or appointment, start the booking flow.
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

// ─── Team Session Management ───────────────────────────────────────────────

app.post('/api/team/register', async (req, res) => {
  try {
    const { sessionId, pin, title } = req.body;
    if (!sessionId || !pin) return res.status(400).json({ error: 'sessionId and pin are required' });

    if (isDbConnected) {
      try {
        const newSession = new TeamSession({ session_id: sessionId, pin, title });
        await newSession.save();
        return res.json({ success: true, mode: 'database' });
      } catch (dbErr) {
        console.warn('Failed to save to DB, falling back to memory:', dbErr.message);
      }
    }

    // Fallback to Memory Store
    memorySessions.set(pin, { sessionId, title, created_at: new Date() });
    if (!memoryMessages.has(sessionId)) {
      memoryMessages.set(sessionId, []);
    }
    console.log(`Registered team session ${pin} in memory mode.`);
    res.json({ success: true, mode: 'memory' });
  } catch (err) {
    console.error('Team Register Error:', err);
    res.status(500).json({ error: 'Failed to register team session' });
  }
});

app.get('/api/team/resolve/:pin', async (req, res) => {
  try {
    const { pin } = req.params;

    // 1. Check Memory Mode First
    if (memorySessions.has(pin)) {
      const session = memorySessions.get(pin);
      return res.json({ success: true, sessionId: session.sessionId, title: session.title, mode: 'memory' });
    }

    // 2. Check Database if connected
    if (isDbConnected) {
      const session = await TeamSession.findOne({ pin });
      if (session) {
        return res.json({ success: true, sessionId: session.session_id, title: session.title, mode: 'database' });
      }
    }

    res.status(404).json({ error: 'Session not found' });
  } catch (err) {
    console.error('Team Resolve Error:', err);
    res.status(500).json({ error: 'Failed to resolve team session' });
  }
});

// ─── Team Message Shared Bank ──────────────────────────────────────────────

app.post('/api/team/messages/save', async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    if (!sessionId || !message) return res.status(400).json({ error: 'sessionId and message are required' });

    // 1. Save to Memory store for immediate collaboration
    if (!memoryMessages.has(sessionId)) {
      memoryMessages.set(sessionId, []);
    }
    const sessionMsgs = memoryMessages.get(sessionId);
    sessionMsgs.push({
      ...message,
      id: message.id || `msg_${Date.now()}`,
      created_at: new Date()
    });
    
    // Keep only last 100 messages in memory to prevent leaks
    if (sessionMsgs.length > 100) sessionMsgs.shift();

    console.log(`Saved message to shared memory for session ${sessionId}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Message Save Error:', err);
    res.status(500).json({ error: 'Failed to save message to shared bank' });
  }
});

app.get('/api/team/messages/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const messages = memoryMessages.get(sessionId) || [];
    res.json({ success: true, messages });
  } catch (err) {
    console.error('Message Load Error:', err);
    res.status(500).json({ error: 'Failed to load messages from shared bank' });
  }
});

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
  const apiKey = req.headers['x-api-key'] || LEADHUNTER_API_KEY;

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
  const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ ERROR: Port ${PORT} (5010) is already in use.`);
      console.error(`Please run the following command to kill the existing process:`);
      console.error(`Stop-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess -Force\n`);
      process.exit(1);
    } else {
      console.error('Server error:', err);
    }
  });
}

module.exports = app;
