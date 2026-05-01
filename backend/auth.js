const { betterAuth } = require("better-auth");
const { Pool } = require("pg");
const { Resend } = require("resend");
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// ─── Resend (password reset emails) ──────────────────────────────────────
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const RESEND_FROM = process.env.RESEND_FROM || 'Britsee <info@britsyncai.com>';

function buildResetEmailHtml(url) {
    return `<!DOCTYPE html>
<html>
  <head><meta charset="utf-8" /></head>
  <body style="margin:0;padding:0;background:#0b0f1a;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#e2e8f0;">
    <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
      <div style="text-align:center;margin-bottom:32px;">
        <div style="display:inline-block;background:#6366f1;width:56px;height:56px;border-radius:14px;line-height:56px;font-size:26px;font-weight:900;color:#fff;">B</div>
        <h1 style="margin:18px 0 4px;font-size:22px;color:#fff;">Britsee</h1>
        <p style="margin:0;color:#94a3b8;font-size:13px;">by BritSync</p>
      </div>
      <div style="background:#131a2b;border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:32px;">
        <h2 style="margin:0 0 16px;font-size:20px;color:#fff;">Reset your password</h2>
        <p style="margin:0 0 20px;line-height:1.55;color:#cbd5e1;font-size:15px;">
          We received a request to reset the password for your Britsee account. Click the button below to set a new password. This link is valid for the next hour.
        </p>
        <div style="text-align:center;margin:28px 0;">
          <a href="${url}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:15px;">Reset Password</a>
        </div>
        <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.5;">
          Didn't request this? You can safely ignore this email — your password won't change.
        </p>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:24px 0;" />
        <p style="margin:0;font-size:12px;color:#64748b;word-break:break-all;">
          If the button doesn't work, copy and paste this link into your browser:<br/>
          <a href="${url}" style="color:#818cf8;">${url}</a>
        </p>
      </div>
      <p style="text-align:center;margin:24px 0 0;font-size:12px;color:#64748b;">
        &copy; ${new Date().getFullYear()} BritSync. All rights reserved.
      </p>
    </div>
  </body>
</html>`;
}

function buildApprovalEmailHtml({ name, approved }) {
    const heading = approved ? 'Your Britsync account is approved' : 'Account application update';
    const intro = approved
        ? `Hi ${name || 'there'}, your Britsync account has been approved by an administrator. You can now sign in and start using the workspace.`
        : `Hi ${name || 'there'}, after review your Britsync account application was not approved at this time. If you believe this was a mistake, please reply to this email.`;
    const ctaLabel = approved ? 'Sign in to Britsync' : 'Contact support';
    const ctaUrl = approved
        ? (process.env.FRONTEND_URL || 'https://britsyncai.com')
        : 'mailto:info@britsyncai.com';
    return `<!DOCTYPE html>
<html>
  <head><meta charset="utf-8" /></head>
  <body style="margin:0;padding:0;background:#0b0f1a;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#e2e8f0;">
    <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
      <div style="text-align:center;margin-bottom:32px;">
        <div style="display:inline-block;background:#6366f1;width:56px;height:56px;border-radius:14px;line-height:56px;font-size:26px;font-weight:900;color:#fff;">B</div>
        <h1 style="margin:18px 0 4px;font-size:22px;color:#fff;">Britsync</h1>
        <p style="margin:0;color:#94a3b8;font-size:13px;">AI Workspace for UK Agencies</p>
      </div>
      <div style="background:#131a2b;border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:32px;">
        <h2 style="margin:0 0 16px;font-size:20px;color:#fff;">${heading}</h2>
        <p style="margin:0 0 20px;line-height:1.55;color:#cbd5e1;font-size:15px;">${intro}</p>
        <div style="text-align:center;margin:28px 0;">
          <a href="${ctaUrl}" style="display:inline-block;background:${approved ? '#10b981' : '#6366f1'};color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:15px;">${ctaLabel}</a>
        </div>
      </div>
      <p style="text-align:center;margin:24px 0 0;font-size:12px;color:#64748b;">
        &copy; ${new Date().getFullYear()} BritSync. All rights reserved.
      </p>
    </div>
  </body>
</html>`;
}

async function sendApprovalEmail({ user, approved }) {
    if (!resend) {
        console.warn('[Auth] RESEND_API_KEY not configured — skipping approval email for', user.email);
        return;
    }
    try {
        const { data, error } = await resend.emails.send({
            from: RESEND_FROM,
            to: user.email,
            subject: approved ? 'Your Britsync account is approved' : 'Britsync account application update',
            html: buildApprovalEmailHtml({ name: user.name, approved }),
        });
        if (error) {
            console.error('[Auth] Resend approval email error:', error);
            return;
        }
        console.log('[Auth] Approval email queued:', data?.id, 'to', user.email);
    } catch (err) {
        console.error('[Auth] sendApprovalEmail failed:', err);
    }
}

async function sendResetPasswordEmail({ user, url }) {
    if (!resend) {
        console.warn('[Auth] RESEND_API_KEY not configured — skipping reset email. URL was:', url);
        return;
    }
    try {
        const { data, error } = await resend.emails.send({
            from: RESEND_FROM,
            to: user.email,
            subject: 'Reset your Britsee password',
            html: buildResetEmailHtml(url),
        });
        if (error) {
            console.error('[Auth] Resend error:', error);
            throw new Error(error.message || 'Failed to send reset email');
        }
        console.log('[Auth] Reset email queued:', data?.id, 'to', user.email);
    } catch (err) {
        console.error('[Auth] sendResetPasswordEmail failed:', err);
        throw err;
    }
}

// In-memory bridge: the request handler picks up the ?ref= token from the
// signup URL and stashes it here keyed by email so the user-create hook can
// consume it atomically with row creation. Cleared on consumption.
const _pendingReferrals = new Map();
function stashSignupReferral(email, token) {
    if (!email || !token) return;
    _pendingReferrals.set(email.toLowerCase(), { token, ts: Date.now() });
    // Auto-expire after 5 minutes so we never leak entries.
    setTimeout(() => _pendingReferrals.delete(email.toLowerCase()), 5 * 60 * 1000);
}

async function consumeReferralForUser(client, user) {
    const email = (user.email || '').toLowerCase();
    const pending = _pendingReferrals.get(email);
    if (!pending) return false;
    _pendingReferrals.delete(email);

    // Atomic claim: only mark used if not already used/revoked.
    const result = await client.query(
        `UPDATE referral_tokens
            SET used_by = $2, used_email = $3, used_at = NOW()
          WHERE token = $1
            AND used_at IS NULL
            AND revoked_at IS NULL
        RETURNING token`,
        [pending.token, user.id, email]
    );
    return result.rowCount > 0;
}

const auth = betterAuth({
    database: pool,
    databaseHooks: {
        user: {
            create: {
                after: async (user) => {
                    const client = await pool.connect();
                    try {
                        const claimed = await consumeReferralForUser(client, user);
                        // Referred users skip approval AND get enterprise plan.
                        // Direct signups land in pending approval + free plan.
                        const approvalStatus = claimed ? 'approved' : 'pending';
                        const decidedAt = claimed ? 'NOW()' : 'NULL';
                        const plan = claimed ? 'enterprise' : 'free';
                        const planSource = claimed ? 'referral' : 'signup';

                        await client.query(
                            `INSERT INTO account_approvals (user_id, status, decided_at, decided_by)
                             VALUES ($1, $2, ${decidedAt}, $3)
                             ON CONFLICT (user_id) DO NOTHING`,
                            [user.id, approvalStatus, claimed ? 'referral' : null]
                        );
                        await client.query(
                            `INSERT INTO account_subscriptions (user_id, plan, source)
                             VALUES ($1, $2, $3)
                             ON CONFLICT (user_id) DO NOTHING`,
                            [user.id, plan, planSource]
                        );
                        console.log(
                            `[Auth] User created: ${user.email} → approval=${approvalStatus}, plan=${plan}`
                        );
                    } catch (err) {
                        console.error('[Auth] Failed to provision new user rows:', err);
                    } finally {
                        client.release();
                    }
                },
            },
        },
    },
    emailAndPassword: {
        enabled: true,
        autoSignIn: true,
        // Called by Better-Auth when the user hits the forget-password endpoint.
        // `url` already includes the reset token and the redirectTo we pass from
        // the frontend (e.g. /reset-password?token=...).
        sendResetPassword: async ({ user, url }) => {
            await sendResetPasswordEmail({ user, url });
        },
        // Token lifetime — 1 hour is the standard for password resets.
        resetPasswordTokenExpiresIn: 60 * 60,
    },
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:5010",
    secret: process.env.BETTER_AUTH_SECRET || "britsync_secret_32_chars_long_random_string_2024",
    trustedOrigins: [
        process.env.FRONTEND_URL || "http://localhost:5173",
        "https://britsyncai.com",
        "capacitor://localhost",
        "http://localhost",
        "https://localhost",
    ],
    // Tell Better-Auth which header carries the real client IP when the app
    // sits behind a reverse proxy (Nginx, and later Cloudflare). Without this
    // Better-Auth can't determine the IP and silently disables its built-in
    // rate limiter for login attempts — leaving brute-force protection off.
    advanced: {
        ipAddress: {
            ipAddressHeaders: ['cf-connecting-ip', 'x-forwarded-for']
        },
        // SameSite=None;Secure so cookies work for both the same-site web app
        // (britsyncai.com → britsyncai.com) and the cross-site Capacitor APK
        // (https://localhost → britsyncai.com). On HTTPS this is supported by
        // all modern browsers and Android WebView.
        defaultCookieAttributes: {
            sameSite: "none",
            secure: true,
        },
    }
});

module.exports = { auth, pool, sendApprovalEmail, stashSignupReferral };
