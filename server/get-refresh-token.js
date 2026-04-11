/**
 * ONE-TIME SCRIPT — Run this once to get your Google OAuth Refresh Token
 * After you get the token, paste it into your .env file and delete this script.
 *
 * HOW TO RUN:
 *   node get-refresh-token.js
 *
 * It will open a URL — log in with britsyncuk@gmail.com and allow permissions.
 * The refresh token will be printed in this terminal automatically.
 */

const { google } = require('googleapis');
const http = require('http');
const url = require('url');

// ── YOUR CREDENTIALS ─────────────────────────────────────────────────────────
const CLIENT_ID = '134074866678-4rb59042fmekhd5aj0kl20cl5objn9ef.apps.googleusercontent.com';
const CLIENT_SECRET = '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y';
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';
// ─────────────────────────────────────────────────────────────────────────────

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
];

const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
});

console.log('\n=================================================');
console.log('  Open this URL in your browser:');
console.log('=================================================');
console.log('\n' + authUrl + '\n');
console.log('=================================================');
console.log('  Log in with: britsyncuk@gmail.com');
console.log('  Then ALLOW permissions.');
console.log('  The token will appear here automatically!');
console.log('=================================================\n');

// Try to auto-open the URL
const { exec } = require('child_process');
exec(`start "" "${authUrl}"`, (err) => {
    if (err) console.log('(Could not auto-open browser — paste the URL manually)');
});

// Start a local server to catch the redirect
const server = http.createServer(async (req, res) => {
    const parsed = url.parse(req.url, true);
    if (parsed.pathname !== '/oauth2callback') {
        res.end('Not found');
        return;
    }

    const code = parsed.query.code;
    if (!code) {
        res.end('<h2>❌ No code received. Try again.</h2>');
        server.close();
        return;
    }

    res.end(`
        <html><body style="font-family:sans-serif;text-align:center;padding:50px;background:#0a0a0a;color:white">
        <h2>✅ Authorization successful!</h2>
        <p>You can close this tab and check your terminal for the refresh token.</p>
        </body></html>
    `);

    try {
        const { tokens } = await oauth2Client.getToken(code);

        console.log('\n✅ SUCCESS! Copy these lines into your .env file:\n');
        console.log('GOOGLE_CLIENT_ID=' + CLIENT_ID);
        console.log('GOOGLE_CLIENT_SECRET=' + CLIENT_SECRET);
        console.log('GOOGLE_REFRESH_TOKEN=' + tokens.refresh_token);
        console.log('GOOGLE_CALENDAR_ID=noblerootuk@gmail.com');
        console.log('\n✅ Done! You can now delete this script and restart the server.\n');
    } catch (err) {
        console.error('\n❌ Error getting tokens:', err.message);
    }

    server.close();
});

server.listen(3000, () => {
    console.log('Waiting for Google to redirect... (server listening on port 3000)\n');
});
