const { Resend } = require('resend');
const { computeKpis, detectAnomalies } = require('./financeAnalytics');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const RESEND_FROM = process.env.RESEND_FROM || 'Britsee <info@britsyncai.com>';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://britsyncai.com';

function gbp(n) {
  if (n == null) return '—';
  return '£' + Math.round(n).toLocaleString('en-GB');
}

function buildReportEmailHtml({ name, kpis, anomalyCount, period, hasData }) {
  if (!hasData) {
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#0b0f1a;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#e2e8f0;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;background:#6366f1;width:56px;height:56px;border-radius:14px;line-height:56px;font-size:26px;font-weight:900;color:#fff;">B</div>
      <h1 style="margin:18px 0 4px;font-size:22px;color:#fff;">Britsync</h1>
      <p style="margin:0;color:#94a3b8;font-size:13px;">${period} finance report</p>
    </div>
    <div style="background:#131a2b;border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:32px;">
      <h2 style="margin:0 0 16px;font-size:20px;color:#fff;">No finance entries yet</h2>
      <p style="margin:0 0 20px;line-height:1.55;color:#cbd5e1;font-size:15px;">
        Hi ${name || 'there'} — we tried to put together your ${period.toLowerCase()} report, but no finance entries were found in your account.
        Add a few revenue and expense entries on the Finance dashboard, and your next report will include real numbers.
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${FRONTEND_URL}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:15px;">Open Finance dashboard</a>
      </div>
    </div>
    <p style="text-align:center;margin:24px 0 0;font-size:12px;color:#64748b;">&copy; ${new Date().getFullYear()} BritSync. All rights reserved.</p>
  </div>
</body></html>`;
  }

  const profitColor = kpis.last30Profit >= 0 ? '#10b981' : '#f43f5e';
  const changeColor = kpis.revenueChangePct >= 0 ? '#10b981' : '#f43f5e';
  const changeArrow = kpis.revenueChangePct >= 0 ? '▲' : '▼';
  const topRows = kpis.topCategories.slice(0, 3).map((c) => `
    <tr>
      <td style="padding:10px 0;color:#cbd5e1;font-size:14px;">${escapeHtml(c.category)}</td>
      <td style="padding:10px 0;text-align:right;color:#fff;font-weight:700;font-size:14px;">${gbp(c.amount)}</td>
      <td style="padding:10px 0;text-align:right;color:#94a3b8;font-size:13px;">${Math.round(c.pct)}%</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#0b0f1a;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#e2e8f0;">
  <div style="max-width:600px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;background:#6366f1;width:56px;height:56px;border-radius:14px;line-height:56px;font-size:26px;font-weight:900;color:#fff;">B</div>
      <h1 style="margin:18px 0 4px;font-size:22px;color:#fff;">Britsync</h1>
      <p style="margin:0;color:#94a3b8;font-size:13px;">${period} finance report</p>
    </div>

    <div style="background:#131a2b;border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:32px;margin-bottom:16px;">
      <h2 style="margin:0 0 8px;font-size:20px;color:#fff;">Hi ${escapeHtml(name || 'there')},</h2>
      <p style="margin:0 0 24px;line-height:1.55;color:#cbd5e1;font-size:15px;">
        Here's your last 30 days at a glance.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
        <tr>
          <td width="50%" style="padding:12px 12px 12px 0;">
            <div style="background:#0f1626;border:1px solid rgba(255,255,255,0.05);border-radius:12px;padding:16px;">
              <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;font-weight:700;">Revenue</div>
              <div style="font-size:22px;color:#fff;font-weight:900;margin-top:4px;">${gbp(kpis.last30Revenue)}</div>
              ${kpis.prev30Revenue > 0 ? `<div style="font-size:12px;color:${changeColor};margin-top:4px;font-weight:600;">${changeArrow} ${Math.abs(kpis.revenueChangePct)}% vs prior 30d</div>` : ''}
            </div>
          </td>
          <td width="50%" style="padding:12px 0 12px 12px;">
            <div style="background:#0f1626;border:1px solid rgba(255,255,255,0.05);border-radius:12px;padding:16px;">
              <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;font-weight:700;">Expenses</div>
              <div style="font-size:22px;color:#fff;font-weight:900;margin-top:4px;">${gbp(kpis.last30Expense)}</div>
            </div>
          </td>
        </tr>
        <tr>
          <td width="50%" style="padding:12px 12px 12px 0;">
            <div style="background:#0f1626;border:1px solid rgba(255,255,255,0.05);border-radius:12px;padding:16px;">
              <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;font-weight:700;">Profit</div>
              <div style="font-size:22px;color:${profitColor};font-weight:900;margin-top:4px;">${gbp(kpis.last30Profit)}</div>
              <div style="font-size:12px;color:#94a3b8;margin-top:4px;">${kpis.marginPct}% margin</div>
            </div>
          </td>
          <td width="50%" style="padding:12px 0 12px 12px;">
            <div style="background:#0f1626;border:1px solid rgba(255,255,255,0.05);border-radius:12px;padding:16px;">
              <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;font-weight:700;">Runway</div>
              <div style="font-size:22px;color:#fff;font-weight:900;margin-top:4px;">${kpis.runwayDays == null ? 'Profitable' : kpis.runwayDays + 'd'}</div>
            </div>
          </td>
        </tr>
      </table>

      ${topRows ? `
      <h3 style="margin:24px 0 8px;font-size:14px;color:#fff;text-transform:uppercase;letter-spacing:0.1em;">Top expense categories</h3>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid rgba(255,255,255,0.05);">
        ${topRows}
      </table>` : ''}

      ${anomalyCount > 0 ? `
      <div style="margin-top:24px;padding:14px 16px;background:rgba(244,63,94,0.08);border:1px solid rgba(244,63,94,0.3);border-radius:12px;">
        <div style="color:#fb7185;font-size:14px;font-weight:700;">⚠ ${anomalyCount} anomal${anomalyCount === 1 ? 'y' : 'ies'} detected</div>
        <div style="color:#cbd5e1;font-size:13px;margin-top:4px;">Open the dashboard to review unusual entries.</div>
      </div>` : ''}

      <div style="text-align:center;margin:32px 0 0;">
        <a href="${FRONTEND_URL}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:15px;">Open full dashboard</a>
      </div>
    </div>

    <p style="text-align:center;margin:24px 0 0;font-size:12px;color:#64748b;">
      You're receiving this because you enabled ${period.toLowerCase()} reports in Britsync.<br/>
      Manage your schedule from the Finance dashboard.<br/>
      &copy; ${new Date().getFullYear()} BritSync. All rights reserved.
    </p>
  </div>
</body></html>`;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

async function sendReportEmail({ user, html, period }) {
  if (!resend) {
    console.warn('[Reports] RESEND_API_KEY not configured — skipping report for', user.email);
    return { skipped: true };
  }
  const { data, error } = await resend.emails.send({
    from: RESEND_FROM,
    to: user.email,
    subject: `Your Britsync ${period.toLowerCase()} finance report`,
    html,
  });
  if (error) {
    console.error('[Reports] Resend error:', error);
    throw new Error(error.message || 'Resend failed');
  }
  console.log('[Reports] Report email queued:', data?.id, 'to', user.email);
  return { id: data?.id };
}

// Loads the recipient list (or single user when opts.userId set), pulls
// finance_entries, computes KPIs, renders + sends, and logs every attempt
// to report_sends. Always swallows per-user errors so one failure can't
// kill the cron tick.
async function runReportJob(pool, cadence, opts = {}) {
  const period = cadence === 'weekly' ? 'Weekly' : 'Monthly';
  let recipients;

  if (opts.userId) {
    // Preview / single-user override — find the user regardless of schedule.
    const { rows } = await pool.query(
      `SELECT u.id AS user_id, u.email, u.name
         FROM "user" u
        WHERE u.id = $1
        LIMIT 1`,
      [opts.userId]
    );
    recipients = rows;
  } else {
    const { rows } = await pool.query(
      `SELECT u.id AS user_id, u.email, u.name
         FROM report_schedules rs
         JOIN "user" u ON u.id = rs.user_id
         JOIN account_subscriptions s ON s.user_id = rs.user_id
        WHERE rs.cadence = $1
          AND rs.enabled = TRUE
          AND s.plan = 'enterprise'`,
      [cadence]
    );
    recipients = rows;
  }

  console.log(`[Reports] runReportJob(${cadence}) → ${recipients.length} recipient(s)`);
  let okCount = 0;
  let errCount = 0;
  let noDataCount = 0;

  for (const r of recipients) {
    try {
      const { rows: entries } = await pool.query(
        `SELECT id, entry_date::text AS entry_date, type, category, amount, note
           FROM finance_entries
          WHERE user_id = $1
          ORDER BY entry_date ASC`,
        [r.user_id]
      );

      const hasData = entries.length > 0;
      const kpis = hasData ? computeKpis(entries) : null;
      const anomalyCount = hasData ? detectAnomalies(entries).length : 0;
      const html = buildReportEmailHtml({
        name: r.name,
        kpis,
        anomalyCount,
        period,
        hasData,
      });

      if (!hasData && !opts.force) {
        // Skip the email when there's nothing to report (saves Resend quota).
        await pool.query(
          `INSERT INTO report_sends (user_id, cadence, status) VALUES ($1, $2, 'no_data')`,
          [r.user_id, cadence]
        );
        noDataCount++;
        continue;
      }

      await sendReportEmail({ user: r, html, period });
      await pool.query(
        `INSERT INTO report_sends (user_id, cadence, status) VALUES ($1, $2, 'ok')`,
        [r.user_id, cadence]
      );
      await pool.query(
        `UPDATE report_schedules SET last_sent_at = NOW(), updated_at = NOW()
          WHERE user_id = $1`,
        [r.user_id]
      );
      okCount++;
    } catch (err) {
      console.error('[Reports] Failed for user', r.user_id, err);
      try {
        await pool.query(
          `INSERT INTO report_sends (user_id, cadence, status, error_msg)
           VALUES ($1, $2, $3, $4)`,
          [r.user_id, cadence, 'error', String(err.message || err).slice(0, 500)]
        );
      } catch { /* ignore log-of-log failure */ }
      errCount++;
    }
  }

  console.log(`[Reports] runReportJob done: ${okCount} sent, ${noDataCount} no_data, ${errCount} errors`);
  return { ok: okCount, noData: noDataCount, errors: errCount };
}

module.exports = { runReportJob, buildReportEmailHtml, sendReportEmail };
