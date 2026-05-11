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
const { auth, pool, sendApprovalEmail, stashSignupReferral, stashSignupIntent } = require('./auth');
const crypto = require('crypto');
const { toNodeHandler } = require("better-auth/node");
const rateLimit = require('express-rate-limit');
const { createCheckoutSession, createSubscriptionIntent, createCustomerPortal, constructEvent, stripe, WEBHOOK_SECRET } = require('./stripe');


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

// ─── Intent / Referral pre-stash endpoints ──────────────────────────────────

// The frontend POSTs { email, intent } here just before calling signUp.email,
// so the user-create hook in auth.js can capture the requested plan.
app.post('/api/account/intent', express.json(), async (req, res) => {
  const { email, intent } = req.body || {};
  if (!email || !intent) return res.status(400).json({ error: 'INVALID_INPUT' });
  stashSignupIntent(email, intent);
  res.json({ ok: true });
});

// The frontend POSTs { email, token } here just before calling signUp.email,
// so the user-create hook in auth.js can match the (just-validated) token to
// the new user by email. Token is verified to exist + be unused; if it's
// revoked or already used we reject so the UI can show a proper message.
app.post('/api/account/claim-referral', express.json(), async (req, res) => {
  const { email, token } = req.body || {};
  if (!email || !token) return res.status(400).json({ error: 'INVALID_INPUT' });
  try {
    const { rows } = await pool.query(
      `SELECT token FROM referral_tokens
        WHERE token = $1 AND used_at IS NULL AND revoked_at IS NULL
        LIMIT 1`,
      [String(token).trim()]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'INVALID_REFERRAL' });
    stashSignupReferral(email, String(token).trim());
    res.json({ ok: true });
  } catch (err) {
    console.error('[/api/account/claim-referral]', err);
    res.status(500).json({ error: 'CLAIM_FAILED' });
  }
});

// Validate a referral token without claiming it (for UI preview)
app.post('/api/account/validate-referral', express.json(), async (req, res) => {
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ valid: false });
  try {
    const { rows } = await pool.query(
      `SELECT token FROM referral_tokens
        WHERE token = $1 AND used_at IS NULL AND revoked_at IS NULL
        LIMIT 1`,
      [String(token).trim()]
    );
    res.json({ valid: rows.length > 0 });
  } catch (err) {
    console.error('[/api/account/validate-referral]', err);
    res.json({ valid: false });
  }
});

// Public seat counter for the landing page social-proof block.
// Counts active enterprise subscriptions against the global cap of 1500.
const SEAT_CAP = 1500;
app.get('/api/seats', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS taken
         FROM account_subscriptions
        WHERE plan = 'enterprise'`
    );
    const taken = rows[0]?.taken || 0;
    res.json({ taken, cap: SEAT_CAP, remaining: Math.max(0, SEAT_CAP - taken) });
  } catch (err) {
    console.error('[/api/seats]', err);
    res.json({ taken: 0, cap: SEAT_CAP, remaining: SEAT_CAP });
  }
});

// Public news feed — RSS aggregator with 10-min in-memory cache.
// Lazy-required so a missing fast-xml-parser dep can't crash the auth boot.
app.get('/api/news', async (req, res) => {
  try {
    const { getCachedNews } = require('./news');
    const force = req.query.force === '1' || req.query.force === 'true';
    const result = await getCachedNews({ force });
    res.json(result);
  } catch (err) {
    console.error('[/api/news]', err);
    res.json({ items: [], fetchedAt: 0, cached: false });
  }
});

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

// ─── Account Approval Gate ────────────────────────────────────────────────
const GLOBAL_MODERATOR_EMAILS = [
  'britsyncuk@gmail.com',
  'kamranalivyond@gmail.com',
];

async function getApprovalStatus(userId) {
  const { rows } = await pool.query(
    'SELECT status FROM account_approvals WHERE user_id = $1',
    [userId]
  );
  return rows[0]?.status || 'pending';
}

async function isAdmin(userId, email) {
  if (email && GLOBAL_MODERATOR_EMAILS.includes(email.toLowerCase())) return true;
  const { rows } = await pool.query(
    'SELECT 1 FROM app_admins WHERE user_id = $1 LIMIT 1',
    [userId]
  );
  return rows.length > 0;
}

async function requireApproved(req, res, next) {
  try {
    const session = await getSession(req);
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'NOT_AUTHENTICATED' });
    }
    const status = await getApprovalStatus(session.user.id);
    if (status !== 'approved') {
      return res.status(403).json({ error: 'PENDING_APPROVAL', status });
    }
    req.session = session;
    next();
  } catch (err) {
    console.error('[requireApproved]', err);
    res.status(500).json({ error: 'AUTH_CHECK_FAILED' });
  }
}

function requirePlan(requiredPlan) {
  return async function planGate(req, res, next) {
    try {
      const session = req.session || (await getSession(req));
      if (!session?.user?.id) return res.status(401).json({ error: 'NOT_AUTHENTICATED' });
      const { rows } = await pool.query(
        'SELECT plan FROM account_subscriptions WHERE user_id = $1',
        [session.user.id]
      );
      const plan = rows[0]?.plan || 'free';
      if (requiredPlan === 'enterprise' && plan !== 'enterprise') {
        return res.status(402).json({ error: 'UPGRADE_REQUIRED', plan, requiredPlan });
      }
      req.session = session;
      req.userPlan = plan;
      next();
    } catch (err) {
      console.error('[requirePlan]', err);
      res.status(500).json({ error: 'PLAN_CHECK_FAILED' });
    }
  };
}

async function requireAdmin(req, res, next) {
  try {
    const session = await getSession(req);
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'NOT_AUTHENTICATED' });
    }
    const ok = await isAdmin(session.user.id, session.user.email);
    if (!ok) return res.status(403).json({ error: 'NOT_ADMIN' });
    req.session = session;
    next();
  } catch (err) {
    console.error('[requireAdmin]', err);
    res.status(500).json({ error: 'AUTH_CHECK_FAILED' });
  }
}

// Frontend probe: am I approved?
app.get('/api/account/status', async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session?.user?.id) return res.status(401).json({ error: 'NOT_AUTHENTICATED' });
    const status = await getApprovalStatus(session.user.id);
    res.json({ status, userId: session.user.id, email: session.user.email });
  } catch (err) {
    console.error('[/api/account/status]', err);
    res.status(500).json({ error: 'STATUS_CHECK_FAILED' });
  }
});

// Admin: list pending users
app.get('/api/admin/pending-users', requireAdmin, async (req, res) => {
  try {
    // Detect whether the optional requested_plan column exists.
    // It was added in a later migration; tolerate older DBs that don't have it.
    const colCheck = await pool.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_name = 'account_approvals' AND column_name = 'requested_plan'
       LIMIT 1`
    );
    const hasPlan = colCheck.rowCount > 0;
    const planSelect = hasPlan ? 'a.requested_plan' : `NULL::text AS requested_plan`;

    const { rows } = await pool.query(
      `SELECT a.user_id, a.status, a.created_at, ${planSelect}, u.email, u.name
       FROM account_approvals a
       JOIN "user" u ON u.id = a.user_id
       WHERE a.status = 'pending'
       ORDER BY a.created_at DESC`
    );
    res.json({ users: rows });
  } catch (err) {
    console.error('[/api/admin/pending-users]', err);
    res.status(500).json({ error: 'LIST_FAILED' });
  }
});

// Admin: approve or reject a user
app.post('/api/admin/approve-user', requireAdmin, async (req, res) => {
  const { userId, decision } = req.body || {};
  if (!userId || !['approved', 'rejected'].includes(decision)) {
    return res.status(400).json({ error: 'INVALID_INPUT' });
  }
  try {
    await pool.query(
      `UPDATE account_approvals
       SET status = $1, decided_by = $2, decided_at = NOW()
       WHERE user_id = $3`,
      [decision, req.session.user.id, userId]
    );
    const { rows } = await pool.query(
      'SELECT email, name FROM "user" WHERE id = $1',
      [userId]
    );
    if (rows[0]?.email) {
      sendApprovalEmail({
        user: { email: rows[0].email, name: rows[0].name },
        approved: decision === 'approved',
      }).catch(err => console.error('[approval email]', err));
    }
    res.json({ ok: true, userId, status: decision });
  } catch (err) {
    console.error('[/api/admin/approve-user]', err);
    res.status(500).json({ error: 'DECIDE_FAILED' });
  }
});

// ─── Subscription plan endpoints ──────────────────────────────────────────
async function getUserPlan(userId) {
  const { rows } = await pool.query(
    'SELECT plan FROM account_subscriptions WHERE user_id = $1',
    [userId]
  );
  return rows[0]?.plan || 'free';
}

// Frontend probe: which plan am I on?
app.get('/api/account/plan', async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session?.user?.id) return res.status(401).json({ error: 'NOT_AUTHENTICATED' });
    const plan = await getUserPlan(session.user.id);
    res.json({ plan });
  } catch (err) {
    console.error('[/api/account/plan]', err);
    res.status(500).json({ error: 'PLAN_CHECK_FAILED' });
  }
});

// Admin: manually upgrade or downgrade a user's plan.
app.post('/api/admin/set-plan', requireAdmin, async (req, res) => {
  const { userId, plan } = req.body || {};
  if (!userId || !['free', 'enterprise'].includes(plan)) {
    return res.status(400).json({ error: 'INVALID_INPUT' });
  }
  try {
    const status = plan === 'enterprise' ? 'active' : 'canceled';
    await pool.query(
      `INSERT INTO account_subscriptions (user_id, plan, subscription_status, source, updated_at)
       VALUES ($1, $2, $3, 'admin', NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET plan = EXCLUDED.plan,
                     subscription_status = EXCLUDED.subscription_status,
                     source = 'admin',
                     updated_at = NOW()`,
      [userId, plan, status]
    );
    res.json({ ok: true, userId, plan, subscriptionStatus: status });
  } catch (err) {
    console.error('[/api/admin/set-plan]', err);
    res.status(500).json({ error: 'SET_PLAN_FAILED' });
  }
});

// ─── Referral admin endpoints ────────────────────────────────────────────
// Generate a single-use referral token. The link returned is what the admin
// shares with the invitee — when they sign up via that link, they skip
// approval and land on the enterprise plan automatically.
app.post('/api/admin/referrals', requireAdmin, async (req, res) => {
  const { note } = req.body || {};
  try {
    const token = crypto.randomBytes(18).toString('base64url');
    await pool.query(
      `INSERT INTO referral_tokens (token, created_by, note)
       VALUES ($1, $2, $3)`,
      [token, req.session.user.id, note ? String(note).slice(0, 200) : null]
    );
    const base = process.env.FRONTEND_URL || 'https://britsyncai.com';
    res.json({
      token,
      url: `${base}/?ref=${encodeURIComponent(token)}`,
      note: note || null,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[/api/admin/referrals POST]', err);
    res.status(500).json({ error: 'GENERATE_FAILED' });
  }
});

app.get('/api/admin/referrals', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.token, t.created_at, t.used_at, t.used_email, t.revoked_at,
              t.note, t.created_by, u.email AS created_by_email
         FROM referral_tokens t
         LEFT JOIN "user" u ON u.id = t.created_by
        ORDER BY t.created_at DESC
        LIMIT 200`
    );
    const base = process.env.FRONTEND_URL || 'https://britsyncai.com';
    res.json({
      tokens: rows.map(r => ({
        ...r,
        url: `${base}/?ref=${encodeURIComponent(r.token)}`,
      })),
    });
  } catch (err) {
    console.error('[/api/admin/referrals GET]', err);
    res.status(500).json({ error: 'LIST_FAILED' });
  }
});

app.post('/api/admin/referrals/revoke', requireAdmin, async (req, res) => {
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: 'INVALID_INPUT' });
  try {
    await pool.query(
      `UPDATE referral_tokens SET revoked_at = NOW()
        WHERE token = $1 AND used_at IS NULL AND revoked_at IS NULL`,
      [token]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[/api/admin/referrals/revoke]', err);
    res.status(500).json({ error: 'REVOKE_FAILED' });
  }
});

// ─── Subscription endpoints ──────────────────────────────────────────────

// Stripe webhook — must be before express.json() middleware strips raw body
// But since we mount express.json() inline on individual routes, this route
// uses raw body parsing to verify the Stripe signature.
app.post('/api/subscription/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  if (!sig) return res.status(400).json({ error: 'No signature' });
  try {
    const event = constructEvent(req.body, sig);

    switch (event.type) {
      case 'checkout.session.completed': {
        const { metadata, subscription } = event.data.object;
        const userId = metadata?.userId;
        if (userId && subscription) {
          const sub = await stripe.subscriptions.retrieve(subscription);
          await pool.query(
            `UPDATE account_subscriptions
             SET plan = 'enterprise', source = 'stripe',
                 stripe_customer_id = $2, stripe_subscription_id = $3,
                 subscription_status = 'active',
                 billing_cycle_start = TO_TIMESTAMP($4),
                 billing_cycle_end = TO_TIMESTAMP($5),
                 updated_at = NOW()
             WHERE user_id = $1`,
            [userId, sub.customer, subscription, sub.current_period_start, sub.current_period_end]
          );
          await pool.query(
            `UPDATE account_approvals SET status = 'approved' WHERE user_id = $1`,
            [userId]
          );
          console.log(`[Stripe] User ${userId} subscribed to enterprise`);
        }
        break;
      }
      case 'invoice.payment_succeeded': {
        const sub = await stripe.subscriptions.retrieve(event.data.object.subscription);
        await pool.query(
          `UPDATE account_subscriptions
           SET subscription_status = 'active',
               billing_cycle_start = TO_TIMESTAMP($1),
               billing_cycle_end = TO_TIMESTAMP($2)
           WHERE stripe_subscription_id = $3`,
          [sub.current_period_start, sub.current_period_end, sub.id]
        );
        break;
      }
      case 'invoice.payment_failed': {
        const sub = await stripe.subscriptions.retrieve(event.data.object.subscription);
        await pool.query(
          `UPDATE account_subscriptions SET subscription_status = 'past_due'
           WHERE stripe_subscription_id = $1`,
          [sub.id]
        );
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await pool.query(
          `UPDATE account_subscriptions
           SET plan = 'free', subscription_status = 'canceled',
               stripe_subscription_id = NULL, source = 'stripe_canceled'
           WHERE stripe_subscription_id = $1`,
          [sub.id]
        );
        console.log(`[Stripe] Subscription ${sub.id} canceled — user downgraded to free`);
        break;
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error('[Stripe webhook error]', err);
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/subscription/create-checkout', async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session?.user?.id) return res.status(401).json({ error: 'NOT_AUTHENTICATED' });
    const { url, sessionId } = await createCheckoutSession(
      session.user.id,
      session.user.email,
      session.user.name || ''
    );
    res.json({ url, sessionId });
  } catch (err) {
    console.error('[create-checkout]', err);
    res.status(500).json({ error: 'CHECKOUT_FAILED' });
  }
});

// Embedded Payment Element flow — keeps user on Britsync (no redirect to Stripe)
app.post('/api/subscription/create-intent', async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session?.user?.id) return res.status(401).json({ error: 'NOT_AUTHENTICATED' });
    const result = await createSubscriptionIntent(session.user.id, session.user.email);
    res.json(result);
  } catch (err) {
    console.error('[create-intent]', err);
    res.status(500).json({ error: 'INTENT_FAILED', message: err.message });
  }
});

app.get('/api/subscription/portal', async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session?.user?.id) return res.status(401).json({ error: 'NOT_AUTHENTICATED' });
    const { rows } = await pool.query(
      'SELECT stripe_customer_id FROM account_subscriptions WHERE user_id = $1',
      [session.user.id]
    );
    if (!rows[0]?.stripe_customer_id) {
      return res.status(400).json({ error: 'NO_CUSTOMER_ID' });
    }
    const url = await createCustomerPortal(rows[0].stripe_customer_id);
    res.json({ url });
  } catch (err) {
    console.error('[subscription-portal]', err);
    res.status(500).json({ error: 'PORTAL_FAILED' });
  }
});

app.post('/api/subscription/cancel', async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session?.user?.id) return res.status(401).json({ error: 'NOT_AUTHENTICATED' });
    const { rows } = await pool.query(
      'SELECT stripe_subscription_id FROM account_subscriptions WHERE user_id = $1',
      [session.user.id]
    );
    if (!rows[0]?.stripe_subscription_id) {
      return res.status(400).json({ error: 'NO_SUBSCRIPTION' });
    }
    await stripe.subscriptions.update(rows[0].stripe_subscription_id, {
      cancel_at_period_end: true,
    });
    await pool.query(
      `UPDATE account_subscriptions SET subscription_status = 'canceled'
       WHERE user_id = $1`,
      [session.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[cancel-subscription]', err);
    res.status(500).json({ error: 'CANCEL_FAILED' });
  }
});

app.get('/api/subscription/status', async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session?.user?.id) return res.status(401).json({ error: 'NOT_AUTHENTICATED' });
    const { rows } = await pool.query(
      `SELECT plan, subscription_status, storage_used, stripe_customer_id,
              stripe_subscription_id, billing_cycle_start, billing_cycle_end,
              source
       FROM account_subscriptions WHERE user_id = $1`,
      [session.user.id]
    );
    const sub = rows[0] || {};
    const STORAGE_LIMIT = 64 * 1024 * 1024 * 1024; // 64 GB in bytes
    res.json({
      plan: sub.plan || 'free',
      subscriptionStatus: sub.subscription_status || 'none',
      storageUsed: sub.storage_used || 0,
      storageLimit: sub.plan === 'enterprise' ? STORAGE_LIMIT : 0,
      billingCycleStart: sub.billing_cycle_start,
      billingCycleEnd: sub.billing_cycle_end,
      source: sub.source || 'signup',
    });
  } catch (err) {
    console.error('[subscription-status]', err);
    res.status(500).json({ error: 'STATUS_FAILED' });
  }
});

app.get('/api/admin/subscriptions', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.user_id, u.email, s.plan, s.subscription_status,
              s.storage_used, s.billing_cycle_start, s.billing_cycle_end,
              s.source, u."createdAt" as created_at
       FROM account_subscriptions s
       JOIN "user" u ON s.user_id = u.id
       ORDER BY u."createdAt" DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('[admin-subscriptions]', err);
    res.status(500).json({ error: 'LIST_FAILED' });
  }
});

app.post('/api/account/storage', async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session?.user?.id) return res.status(401).json({ error: 'NOT_AUTHENTICATED' });
    const { bytes } = req.body || {};
    if (bytes === undefined) {
      const { rows } = await pool.query(
        'SELECT storage_used FROM account_subscriptions WHERE user_id = $1',
        [session.user.id]
      );
      return res.json({ used: rows[0]?.storage_used || 0 });
    }
    await pool.query(
      `UPDATE account_subscriptions
       SET storage_used = COALESCE(storage_used, 0) + $2, updated_at = NOW()
       WHERE user_id = $1`,
      [session.user.id, bytes]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[storage-update]', err);
    res.status(500).json({ error: 'STORAGE_FAILED' });
  }
});

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
app.post('/api/groq', requireApproved, groqRateLimiter, groqDailyLimiter, async (req, res) => {
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

## CONTACT
- The ONLY official contact / admin / support email is **info@britsyncai.com**.
- If asked for an admin email, support email, contact email, or how to reach BritSync — reply with exactly **info@britsyncai.com**.
- Never invent, guess, or fabricate any other email address (e.g. support@britsee.co, admin@..., hello@...). If a different address appears anywhere, ignore it and use info@britsyncai.com.

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

app.post('/api/bot/chat', requireApproved, async (req, res) => {
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

app.all('/api/lh/external/*', requireApproved, requirePlan('enterprise'), async (req, res) => {
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

app.all('/api/lh/standard/*', requireApproved, requirePlan('enterprise'), async (req, res) => {
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

app.all('/api/sender/*', requireApproved, requirePlan('enterprise'), async (req, res) => {
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

app.post('/api/browser/search', requireApproved, requirePlan('enterprise'), async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });
  try {
    const result = await browserAgent.googleSearch(query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/browser/youtube', requireApproved, requirePlan('enterprise'), async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });
  try {
    const result = await browserAgent.youtubeSearch(query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/browser/linkedin', requireApproved, requirePlan('enterprise'), async (req, res) => {
  const { query, location } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });
  try {
    const result = await browserAgent.linkedinJobSearch(query, location || 'United Kingdom');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/browser/leads', requireApproved, requirePlan('enterprise'), async (req, res) => {
  const { query, location } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });
  try {
    const result = await browserAgent.getLeads(query, location || 'UK');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/browser/open', requireApproved, requirePlan('enterprise'), async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  try {
    const result = await browserAgent.openUrl(url);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/browser/close', requireApproved, requirePlan('enterprise'), async (req, res) => {
  try {
    await browserAgent.closeBrowser();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Auto Reports (scheduled finance summary emails) ─────────────────────
const cron = require('node-cron');
const { runReportJob } = require('./reports');

app.get('/api/finance/report-schedule', requireApproved, requirePlan('enterprise'), async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { rows } = await pool.query(
      `SELECT cadence, last_sent_at FROM report_schedules WHERE user_id = $1`,
      [userId]
    );
    res.json(rows[0] || { cadence: 'disabled', last_sent_at: null });
  } catch (err) {
    console.error('[GET /report-schedule]', err);
    res.status(500).json({ error: 'LOAD_FAILED' });
  }
});

app.put('/api/finance/report-schedule', requireApproved, requirePlan('enterprise'), async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { cadence } = req.body || {};
    if (!['disabled', 'weekly', 'monthly'].includes(cadence)) {
      return res.status(400).json({ error: 'INVALID_CADENCE' });
    }
    await pool.query(
      `INSERT INTO report_schedules (user_id, cadence)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE
         SET cadence = EXCLUDED.cadence, updated_at = NOW()`,
      [userId, cadence]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[PUT /report-schedule]', err);
    res.status(500).json({ error: 'SAVE_FAILED' });
  }
});

app.post('/api/finance/report/preview', requireApproved, requirePlan('enterprise'), async (req, res) => {
  try {
    const userId = req.session.user.id;
    const result = await runReportJob(pool, 'weekly', { userId, force: true });
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[POST /report/preview]', err);
    res.status(500).json({ error: 'PREVIEW_FAILED', message: err.message });
  }
});

app.post('/api/admin/report/run', requireAdmin, async (req, res) => {
  try {
    const { cadence } = req.body || {};
    if (!['weekly', 'monthly'].includes(cadence)) {
      return res.status(400).json({ error: 'INVALID_CADENCE' });
    }
    const result = await runReportJob(pool, cadence);
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[POST /admin/report/run]', err);
    res.status(500).json({ error: 'RUN_FAILED', message: err.message });
  }
});

// Cron jobs — registered once at server boot. Skipped on Vercel since we
// don't want serverless cold starts to spawn schedulers.
if (!process.env.VERCEL) {
  cron.schedule('0 9 * * 1', () => {
    runReportJob(pool, 'weekly').catch(err => console.error('[Cron weekly]', err));
  }, { timezone: 'UTC' });

  cron.schedule('0 9 1 * *', () => {
    runReportJob(pool, 'monthly').catch(err => console.error('[Cron monthly]', err));
  }, { timezone: 'UTC' });

  console.log('[Cron] Auto-report jobs registered (weekly Mon, monthly 1st, 09:00 UTC)');
}

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
