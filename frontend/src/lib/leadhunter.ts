import { SettingsService } from './settings';
import { getApiUrl } from './api-config';

/**
 * LeadHunter Service — Aligned with official API documentation
 *
 * ARCHITECTURE:
 * - External API (/api/external/...) → x-api-key header, proxied via /api/leadhunter
 * - Standard API (/api/...) → session cookie auth, proxied via /api/leadhunter
 *
 * External API endpoints available:
 *   GET  /api/external/countries
 *   POST /api/external/jobs
 *   GET  /api/external/jobs/:jobId/status
 *
 * Session API endpoints (used when External API lacks coverage):
 *   GET  /api/metadata        → countries
 *   GET  /api/location        → states/cities
 *   GET  /api/history         → job history
 *   GET  /api/jobs/:id/events → SSE real-time progress
 */

/**
 * Returns the External API base URL.
 * Always routes through britsee-server (port 5010) which handles
 * authentication and proxying server-side.
 *
 * britsee-server:  /api/lh/* → https://leadhunter.uk/api/external/*
 */
function getExternalBase(): string {
  return getApiUrl('/lh/external');
}

function getStandardBase(): string {
  return getApiUrl('/lh/standard');
}

/**
 * Returns the SSE events URL for a job (uses dedicated SSE proxy route).
 */
function getEventsUrl(jobId: string): string {
  return getApiUrl(`/lh-events/${jobId}`);
}

export interface ScraperJob {
  jobId: string;
  status: 'running' | 'completed' | 'failed';
  leadsFound?: number;
  files?: { name: string; url: string }[];
}

export interface JobConfig {
  country: string;
  niches: string[];
  cities?: string[];      // doc field: "cities" not "states"
  scrapeMode?: 'emails' | 'phones' | 'both';
  includeGoogleMaps?: boolean;
  category?: string;
}

// ─── External API (x-api-key) ─────────────────────────────────────────────────

export const LeadHunterService = {

  getApiKey() {
    return SettingsService.getLeadHunterApiKey();
  },

  /**
   * Core authenticated fetch for the External API.
   * Uses x-api-key header as per Section 5 of API docs.
   */
  async request(path: string, options: RequestInit = {}): Promise<any> {
    const apiKey = SettingsService.getLeadHunterApiKey();
    if (!apiKey) throw new Error('No LeadHunter API key. Please add it in Settings.');

    const externalBase = getExternalBase();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(`${externalBase}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          ...options.headers,
        },
        signal: controller.signal
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.message || err?.error || `LeadHunter error: ${response.status}`);
      }

      return await response.json();
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('LeadHunter server timed out. Please try again.');
      }
      if (err.message?.includes('Failed to fetch')) {
        throw new Error('Unable to reach LeadHunter. Check your internet connection.');
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  /**
   * Start a new lead scraping job.
   * POST /api/external/jobs
   * Body uses "cities" (not "states") per API docs.
   */
  async startJob(config: JobConfig): Promise<ScraperJob> {
    return this.request('/jobs', {
      method: 'POST',
      body: JSON.stringify({
        country: config.country,
        niches: config.niches,
        cities: config.cities || [],      // ← correct field name from docs
        scrapeMode: config.scrapeMode || 'both',
        includeGoogleMaps: config.includeGoogleMaps ?? true,
        category: config.category || 'BritSee Leads',
      }),
    });
  },

  /**
   * Poll status of a running job.
   * GET /api/external/jobs/:jobId/status
   * Returns download links when completed.
   */
  async getJobStatus(jobId: string): Promise<ScraperJob> {
    return this.request(`/jobs/${jobId}/status`);
  },

  /**
   * Get available countries for scraping.
   * GET /api/external/countries
   */
  async getCountries(): Promise<string[]> {
    try {
      const data = await this.request('/countries');
      return data.countries || ['USA', 'United Kingdom', 'Canada', 'Australia'];
    } catch (e) {
      return ['USA', 'United Kingdom', 'Canada', 'Australia'];
    }
  },

  /**
   * Get states/cities for a country.
   * GET /api/location
   */
  async getLocations(country: string, state?: string): Promise<string[]> {
    try {
      const base = getStandardBase();
      const url = new URL(`${base}/location`, window.location.origin);
      url.searchParams.append('country', country);
      if (state) url.searchParams.append('state', state);

      const response = await fetch(url.toString());
      if (!response.ok) return [];
      const data = await response.json();
      return data.cities || data.states || [];
    } catch {
      return [];
    }
  },

  /**
   * Get history of previous scraping jobs.
   * GET /api/history — session-auth only.
   */
  async getHistory(): Promise<ScraperJob[]> {
    try {
      const base = getStandardBase();
      const response = await fetch(`${base}/history`);
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : (data.jobs || []);
    } catch {
      return [];
    }
  },

  /**
   * Subscribe to real-time job progress via Server-Sent Events.
   * GET /api/jobs/:jobId/events — SSE stream from docs Section 2.
   * Returns an EventSource; caller is responsible for closing it.
   *
   * Usage:
   *   const es = LeadHunterService.subscribeToJobEvents(jobId, (data) => {...});
   *   // When done: es.close();
   */
  subscribeToJobEvents(
    jobId: string,
    onProgress: (data: { type: string; leadsFound?: number; status?: string }) => void,
    onError?: (err: Event) => void
  ): EventSource {
    const url = getEventsUrl(jobId);
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onProgress(data);
        if (data.type === 'COMPLETED' || data.type === 'FAILED') {
          eventSource.close();
        }
      } catch {
        // Ignore non-JSON messages
      }
    };

    if (onError) {
      eventSource.onerror = onError;
    }

    return eventSource;
  },

  /**
   * Stop a running scraping job.
   * POST /api/jobs/:jobId/stop
   */
  async stopJob(jobId: string): Promise<void> {
    try {
      const base = getStandardBase();
      await fetch(`${base}/jobs/${jobId}/stop`, {
        method: 'POST',
      });
    } catch {
      // Best-effort stop
    }
  },

  /**
   * Build a raw download URL for a completed job file.
   */
  getDownloadUrl(jobId: string, fileName: string): string {
    return `${getExternalBase()}/jobs/${jobId}/download/${fileName}`;
  },

  /**
   * Download leads file content directly.
   * GET /api/external/jobs/:jobId/download/:fileName
   */
  async downloadLeads(jobId: string, fileName: string = 'all_emails.txt'): Promise<string> {
    const apiKey = SettingsService.getLeadHunterApiKey();
    if (!apiKey) throw new Error('No LeadHunter API key.');

    const response = await fetch(`${getExternalBase()}/jobs/${jobId}/download/${fileName}`, {
      headers: { 'x-api-key': apiKey },
    });

    if (!response.ok) throw new Error(`Download failed: ${response.status}`);
    return await response.text();
  },

  /**
   * Test if the API key is valid.
   * GET /api/external/countries → expects 200 OK
   */
  async testConnection(key: string): Promise<boolean> {
    try {
      const externalBase = getExternalBase();
      const response = await fetch(`${externalBase}/countries`, {
        headers: { 'x-api-key': key },
        signal: AbortSignal.timeout(8000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
};
