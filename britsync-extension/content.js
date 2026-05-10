// Britsync Companion — content script
// Runs inside every page. Executes click/type/scroll commands from background.js.

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  try {
    switch (msg.type) {
      case 'CLICK': {
        const el = findElement(msg.selector, msg.text);
        if (!el) return sendResponse({ ok: false, error: 'Element not found' });
        el.scrollIntoView({ block: 'center', behavior: 'instant' });
        el.click();
        return sendResponse({ ok: true, clicked: describe(el) });
      }
      case 'TYPE': {
        const el = findElement(msg.selector);
        if (!el) return sendResponse({ ok: false, error: 'Element not found' });
        el.focus();
        if ('value' in el) {
          el.value = msg.value;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          el.textContent = msg.value;
        }
        return sendResponse({ ok: true, typed: msg.value });
      }
      case 'SCROLL': {
        window.scrollBy({ top: msg.y, behavior: 'smooth' });
        return sendResponse({ ok: true, scrolled: msg.y });
      }
      default:
        return sendResponse({ ok: false, error: 'Unknown content action' });
    }
  } catch (err) {
    sendResponse({ ok: false, error: err.message || String(err) });
  }
  return true;
});

function findElement(selector, text) {
  if (selector) {
    const el = document.querySelector(selector);
    if (el) return el;
  }
  if (text) {
    const target = text.trim().toLowerCase();
    const candidates = document.querySelectorAll('button, a, [role="button"], input[type="submit"]');
    for (const el of candidates) {
      const label = (el.innerText || el.value || el.getAttribute('aria-label') || '').trim().toLowerCase();
      if (label.includes(target)) return el;
    }
  }
  return null;
}

function describe(el) {
  return {
    tag: el.tagName.toLowerCase(),
    text: (el.innerText || el.value || '').slice(0, 80),
  };
}
