# Britsync Companion

A Chrome extension that lets the Britsync AI web app control the user's browser to automate research, lead generation, and outreach tasks.

## What it does

- Open / close / navigate tabs on command
- Click buttons or links by text or CSS selector
- Type into form fields
- Scroll pages
- Capture screenshots (used by the AI vision loop)
- Read page text for summarization

All commands originate from the Britsync web app and are executed locally in the user's browser. Nothing happens unless the user is signed in to Britsync and triggers an action.

## File layout

```
britsync-extension/
├── manifest.json     Manifest V3 config + permissions
├── background.js     Service worker — receives commands from britsyncai.com
├── content.js        Injected into pages — performs click/type/scroll
├── popup.html        Toolbar popup UI
├── popup.js
├── icons/            16/48/128 px icons (currently using favicon as placeholder)
└── README.md
```

## Install for local testing

1. Open `chrome://extensions` in Chrome (or Edge)
2. Toggle **Developer mode** ON (top right)
3. Click **Load unpacked**
4. Select the `britsync-extension/` folder
5. The Britsync icon should appear in the toolbar

## How the web app talks to it

The Britsync web app sends commands via `chrome.runtime.sendMessage` using the published extension ID. Allowed origins:

- `https://britsyncai.com`
- `http://localhost:5173` (dev)
- `http://localhost:5010` (dev)

Example (from the web app):

```js
chrome.runtime.sendMessage(EXTENSION_ID, {
  action: 'OPEN_TAB',
  payload: { url: 'https://youtube.com' },
}, (response) => console.log(response));
```

## Supported actions

| Action          | Payload                           | Description                                  |
| --------------- | --------------------------------- | -------------------------------------------- |
| `PING`          | —                                 | Connection check                             |
| `OPEN_TAB`      | `{ url, active? }`                | Opens a new tab                              |
| `NAVIGATE`      | `{ tabId?, url }`                 | Navigates a tab                              |
| `LIST_TABS`     | —                                 | Returns all tabs in all windows              |
| `CLOSE_TAB`     | `{ tabId? }`                      | Closes a tab                                 |
| `GET_PAGE_TEXT` | `{ tabId? }`                      | Returns up to 20k chars of `document.body`   |
| `CLICK`         | `{ tabId?, selector?, text? }`    | Clicks element by selector or visible text   |
| `TYPE`          | `{ tabId?, selector, value }`     | Types into input/textarea                    |
| `SCROLL`        | `{ tabId?, y }`                   | Scrolls the page by `y` pixels               |
| `SCREENSHOT`    | `{ tabId? }`                      | Returns PNG data URL of visible viewport     |

If `tabId` is omitted, the active tab in the current window is used.

## Building for Chrome Web Store (later)

1. Replace placeholder icons in `icons/` with real 16/48/128 PNGs
2. Bump `version` in `manifest.json`
3. Zip the folder contents (not the folder itself):
   ```
   cd britsync-extension && zip -r ../britsync-companion.zip .
   ```
4. Upload to https://chrome.google.com/webstore/devconsole
5. Fill in store listing, privacy policy, screenshots
6. Submit for review (2–14 days)

## Privacy

- No analytics, telemetry, or third-party tracking
- Only communicates with `britsyncai.com` and configured dev origins
- Never reads page content unless the user has triggered an action
- Screenshots and page text are sent only to the user's own Britsync session

See `frontend/public/privacy.html` for the full privacy policy.
