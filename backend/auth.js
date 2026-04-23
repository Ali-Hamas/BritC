const { betterAuth } = require("better-auth");
const { Pool } = require("pg");
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Add SSL for production
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const auth = betterAuth({
    database: pool,
    emailAndPassword: {
        enabled: true,
        autoSignIn: true
    },
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:5010",
    secret: process.env.BETTER_AUTH_SECRET || "britsync_secret_32_chars_long_random_string_2024",
    trustedOrigins: [process.env.FRONTEND_URL || "http://localhost:5173"],
    // Tell Better-Auth which header carries the real client IP when the app
    // sits behind a reverse proxy (Nginx, and later Cloudflare). Without this
    // Better-Auth can't determine the IP and silently disables its built-in
    // rate limiter for login attempts — leaving brute-force protection off.
    advanced: {
        ipAddress: {
            // Checked in order. CF-Connecting-IP wins when Cloudflare is fronting
            // traffic; X-Forwarded-For is the standard Nginx header.
            ipAddressHeaders: ['cf-connecting-ip', 'x-forwarded-for']
        }
    }
});

module.exports = { auth };
