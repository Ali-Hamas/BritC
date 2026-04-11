/**
 * Sender Service — Email Campaign API
 * Aligned with official LeadHunter Sender API docs (Section 3 & 4)
 *
 * Base URL: /api/sender (Vite-proxied to https://leadhunter.uk/api/sender)
 *
 * Key endpoints:
 *   POST /api/sender/campaigns        → launch campaign
 *   GET  /api/sender/campaigns        → list campaigns
 *   GET  /api/sender/smtp             → list saved SMTP accounts
 *   POST /api/sender/smtp             → save new SMTP account
 *   GET  /api/sender/analytics/account    → account-level stats
 *   GET  /api/sender/analytics/history    → per-campaign history
 *   GET  /api/sender/analytics/:id        → specific campaign stats
 */

// Proxied via Vite to bypass CORS issues.
const SENDER_BASE = '/api/sender';

export interface CampaignConfig {
  campaignName: string;       // was "name" — corrected per docs
  senderName: string;         // NEW: required by API
  subject: string;
  htmlContent: string;        // was "body" — corrected per docs (supports HTML + {{name}})
  recipients: string[];       // was "listId" — corrected: needs actual email array
  smtpAccountIds?: string[];  // premium: use saved SMTP accounts
  // Basic SMTP (non-premium): provide these instead of smtpAccountIds
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
}

export interface SmtpAccount {
  id: string;
  host: string;
  port: number;
  user: string;
  label?: string;
}

export interface CampaignStats {
  rawCounts: {
    sent: number;
    delivered: number;
    uniqueOpens: number;
    uniqueClicks: number;
  };
  metrics: {
    openRate: string;
    clickThroughRate: string;
  };
}

export interface AccountStats {
  totalSent: number;
  openRate: string;
  ctr: string;
  [key: string]: any;
}

// ─── Core fetch helper ─────────────────────────────────────────────────────────

async function senderFetch(path: string, options: RequestInit = {}): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(`${SENDER_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',   // session cookie auth — docs use session, not API key
      signal: controller.signal,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.message || err?.error || `Sender error: ${response.status}`);
    }

    // Some endpoints return 204 No Content
    const text = await response.text();
    return text ? JSON.parse(text) : {};
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Sender service timed out. Please try again.');
    }
    if (err.message?.includes('Failed to fetch')) {
      throw new Error('Unable to reach Sender service. Check your connection.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── Sender Service ────────────────────────────────────────────────────────────

export const SenderService = {

  /**
   * Launch a new email campaign.
   * POST /api/sender/campaigns
   *
   * For basic users: provide smtpHost, smtpPort, smtpUser, smtpPass.
   * For premium users: provide smtpAccountIds (list of saved SMTP account IDs).
   */
  async launchCampaign(config: CampaignConfig): Promise<{ campaignId: string }> {
    return senderFetch('/campaigns', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  },

  /**
   * List all campaigns with their current status.
   * GET /api/sender/analytics/history
   */
  async getCampaigns(): Promise<any[]> {
    try {
      const data = await senderFetch('/analytics/history');
      return Array.isArray(data) ? data : (data.campaigns || []);
    } catch {
      return [];
    }
  },

  /**
   * Get account-level analytics (totals across all campaigns).
   * GET /api/sender/analytics/account
   */
  async getAccountStats(): Promise<AccountStats | null> {
    try {
      return await senderFetch('/analytics/account');
    } catch {
      return null;
    }
  },

  /**
   * Get detailed stats for a specific campaign.
   * GET /api/sender/analytics/:campaignId
   */
  async getCampaignStats(campaignId: string): Promise<CampaignStats | null> {
    try {
      return await senderFetch(`/analytics/${campaignId}`);
    } catch {
      return null;
    }
  },

  /**
   * List all saved SMTP accounts.
   * GET /api/sender/smtp
   */
  async getSmtpAccounts(): Promise<SmtpAccount[]> {
    try {
      const data = await senderFetch('/smtp');
      return Array.isArray(data) ? data : (data.accounts || []);
    } catch {
      return [];
    }
  },

  /**
   * Save a new SMTP account. Backend verifies connection before saving.
   * POST /api/sender/smtp
   */
  async addSmtpAccount(smtp: {
    host: string;
    port: number;
    user: string;
    pass: string;
  }): Promise<SmtpAccount> {
    return senderFetch('/smtp', {
      method: 'POST',
      body: JSON.stringify(smtp),
    });
  },
};
