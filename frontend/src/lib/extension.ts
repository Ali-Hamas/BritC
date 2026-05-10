// Britsync Companion extension bridge.
// Sends commands to the installed Chrome extension and returns results.

const EXTENSION_ID = 'johehkokcpkifdabdfekljbpglkfpbnc';

declare global {
  interface Window {
    chrome?: any;
  }
}

export interface ExtensionResponse<T = any> {
  ok: boolean;
  result?: T;
  error?: string;
}

function getChromeRuntime(): any | null {
  if (typeof window === 'undefined') return null;
  const c = (window as any).chrome;
  if (c && c.runtime && typeof c.runtime.sendMessage === 'function') return c.runtime;
  return null;
}

export async function isExtensionInstalled(): Promise<boolean> {
  const runtime = getChromeRuntime();
  if (!runtime) return false;
  try {
    const res = await sendCommand('PING');
    return !!res.ok;
  } catch {
    return false;
  }
}

export function sendCommand<T = any>(
  action: string,
  payload: Record<string, any> = {}
): Promise<ExtensionResponse<T>> {
  return new Promise((resolve) => {
    const runtime = getChromeRuntime();
    if (!runtime) {
      resolve({ ok: false, error: 'EXTENSION_NOT_FOUND' });
      return;
    }
    try {
      runtime.sendMessage(EXTENSION_ID, { action, payload }, (response: any) => {
        const lastError = runtime.lastError;
        if (lastError) {
          resolve({ ok: false, error: lastError.message || 'EXTENSION_ERROR' });
          return;
        }
        if (!response) {
          resolve({ ok: false, error: 'NO_RESPONSE' });
          return;
        }
        resolve(response);
      });
    } catch (err: any) {
      resolve({ ok: false, error: err?.message || 'SEND_FAILED' });
    }
  });
}

// Convenience helpers
export const ext = {
  ping: () => sendCommand('PING'),
  openTab: (url: string, active = true) => sendCommand('OPEN_TAB', { url, active }),
  navigate: (url: string, tabId?: number) => sendCommand('NAVIGATE', { url, tabId }),
  listTabs: () => sendCommand<Array<{ id: number; url: string; title: string; active: boolean }>>('LIST_TABS'),
  closeTab: (tabId?: number) => sendCommand('CLOSE_TAB', { tabId }),
  getPageText: (tabId?: number) => sendCommand<{ text: string }>('GET_PAGE_TEXT', { tabId }),
  click: (opts: { selector?: string; text?: string; tabId?: number }) => sendCommand('CLICK', opts),
  type: (opts: { selector: string; value: string; tabId?: number }) => sendCommand('TYPE', opts),
  scroll: (y = 600, tabId?: number) => sendCommand('SCROLL', { y, tabId }),
  screenshot: (tabId?: number) => sendCommand<{ dataUrl: string }>('SCREENSHOT', { tabId }),
};

export const EXTENSION_INSTALL_URL =
  'https://chrome.google.com/webstore/detail/britsync-companion/' + EXTENSION_ID;
