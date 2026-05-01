const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  console.log('Adding requested_plan to account_approvals...');
  try {
    await pool.query(`
      ALTER TABLE account_approvals ADD COLUMN IF NOT EXISTS requested_plan TEXT DEFAULT 'free';
    `);
    console.log('✅ Column added successfully');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

run();
