// Britsync Companion — background service worker
// Receives commands from the Britsync web app and executes them on browser tabs.

const ALLOWED_ORIGINS = [
  'https://britsyncai.com',
  'http://localhost:5173',
  'http://localhost:5010',
];

// External messages from the Britsync web app
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  const origin = sender.origin || sender.url || '';
  const allowed = ALLOWED_ORIGINS.some((o) => origin.startsWith(o));
  if (!allowed) {
    sendResponse({ ok: false, error: 'ORIGIN_NOT_ALLOWED' });
    return true;
  }

  handleCommand(message)
    .then((result) => sendResponse({ ok: true, result }))
    .catch((err) => sendResponse({ ok: false, error: err.message || String(err) }));

  return true; // keep the channel open for async sendResponse
});

async function handleCommand(message) {
  const { action, payload = {} } = message || {};

  switch (action) {
    case 'PING':
      return { connected: true, version: chrome.runtime.getManifest().version };

    case 'OPEN_TAB': {
      const tab = await chrome.tabs.create({ url: payload.url, active: payload.active !== false });
      return { tabId: tab.id, url: tab.url };
    }

    case 'NAVIGATE': {
      const tabId = await resolveTabId(payload.tabId);
      await chrome.tabs.update(tabId, { url: payload.url });
      return { tabId };
    }

    case 'LIST_TABS': {
      const tabs = await chrome.tabs.query({});
      return tabs.map((t) => ({ id: t.id, url: t.url, title: t.title, active: t.active }));
    }

    case 'CLOSE_TAB': {
      const tabId = await resolveTabId(payload.tabId);
      await chrome.tabs.remove(tabId);
      return { closed: tabId };
    }

    case 'GET_PAGE_TEXT': {
      const tabId = await resolveTabId(payload.tabId);
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => document.body.innerText.slice(0, 20000),
      });
      return { text: result };
    }

    case 'CLICK': {
      const tabId = await resolveTabId(payload.tabId);
      return await sendToContent(tabId, { type: 'CLICK', selector: payload.selector, text: payload.text });
    }

    case 'TYPE': {
      const tabId = await resolveTabId(payload.tabId);
      return await sendToContent(tabId, { type: 'TYPE', selector: payload.selector, value: payload.value });
    }

    case 'SCROLL': {
      const tabId = await resolveTabId(payload.tabId);
      return await sendToContent(tabId, { type: 'SCROLL', y: payload.y || 600 });
    }

    case 'SCREENSHOT': {
      const tabId = await resolveTabId(payload.tabId);
      const tab = await chrome.tabs.get(tabId);
      const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
      return { dataUrl };
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

async function resolveTabId(tabId) {
  if (tabId) return tabId;
  const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!active) throw new Error('No active tab');
  return active.id;
}

function sendToContent(tabId, msg) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, msg, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}
