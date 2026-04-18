const { betterAuth } = require("better-auth");
const { Pool } = require("pg");
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Add SSL for production
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const auth = betterAuth({
    database: {
        db: pool,
        type: "postgres"
    },
    emailAndPassword: {
        enabled: true,
        autoSignIn: true
    },
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:5010",
    secret: process.env.BETTER_AUTH_SECRET || "britsync_secret_32_chars_long_random_string_2024"
});

module.exports = { auth };
