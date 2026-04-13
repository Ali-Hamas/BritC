/**
 * Browser Agent Service — Frontend client for the Puppeteer backend
 * Calls britsync-server at port 5010 to control the browser
 */

// Proxied via Vite to the optional britsync-server backend
const SERVER_URL = '/api/browser';

export interface BrowserResult {
  success: boolean;
  engine?: string;
  query?: string;
  results?: any[];
  screenshot?: string;  // base64 data URL
  url?: string;
  title?: string;
  error?: string;
}

export const BrowserAgentService = {
  /**
   * Search Google and return top results + screenshot
   */
  async searchGoogle(query: string): Promise<BrowserResult> {
    const res = await fetch(`${SERVER_URL}/api/browser/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Google search failed');
    }
    return res.json();
  },

  /**
   * Search YouTube and return top video results + screenshot
   */
  async searchYouTube(query: string): Promise<BrowserResult> {
    const res = await fetch(`${SERVER_URL}/api/browser/youtube`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'YouTube search failed');
    }
    return res.json();
  },

  /**
   * Search LinkedIn jobs and return listings + screenshot
   */
  async searchLinkedInJobs(query: string, location = 'United Kingdom'): Promise<BrowserResult> {
    const res = await fetch(`${SERVER_URL}/api/browser/linkedin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, location }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'LinkedIn search failed');
    }
    return res.json();
  },

  /**
   * Open any URL in the browser and return screenshot
   */
  async openUrl(url: string): Promise<BrowserResult> {
    // Ensure URL has protocol
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    const res = await fetch(`${SERVER_URL}/api/browser/open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: fullUrl }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Failed to open URL');
    }
    return res.json();
  },

  /**
   * Close the browser session on the server
   */
  async close(): Promise<void> {
    await fetch(`${SERVER_URL}/api/browser/close`, { method: 'POST' }).catch(() => {});
  },
};
