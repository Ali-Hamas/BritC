const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function runMigration() {
  console.log('Running subscription migration...');

  // Execute raw SQL via the Supabase API
  const { error } = await supabase.rpc('run_sql', {
    sql: `
      ALTER TABLE account_approvals DROP CONSTRAINT IF EXISTS account_approvals_status_check;
      ALTER TABLE account_approvals ADD CONSTRAINT account_approvals_status_check
        CHECK (status IN ('pending', 'approved', 'rejected', 'referral_required'));
    `
  });

  if (error) {
    console.log('Direct SQL via RPC not available. Applying via individual commands...');

    // Try using the pg pool directly
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    try {
      await pool.query(`
        ALTER TABLE account_approvals DROP CONSTRAINT IF EXISTS account_approvals_status_check;
        ALTER TABLE account_approvals ADD CONSTRAINT account_approvals_status_check
          CHECK (status IN ('pending', 'approved', 'rejected', 'referral_required'));
      `);
      console.log('✅ account_approvals status constraint updated');

      await pool.query(`
        ALTER TABLE account_subscriptions ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
        ALTER TABLE account_subscriptions ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
        ALTER TABLE account_subscriptions ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none';
        ALTER TABLE account_subscriptions ADD COLUMN IF NOT EXISTS storage_used BIGINT DEFAULT 0;
        ALTER TABLE account_subscriptions ADD COLUMN IF NOT EXISTS billing_cycle_start TIMESTAMPTZ;
        ALTER TABLE account_subscriptions ADD COLUMN IF NOT EXISTS billing_cycle_end TIMESTAMPTZ;
      `);
      console.log('✅ account_subscriptions columns added');

      await pool.query(`
        UPDATE account_subscriptions SET plan = 'free', source = 'backfill_migrated';
      `);
      console.log('✅ All users shifted to free plan');

      await pool.end();
      console.log('\n✅ Migration complete!');
    } catch (err) {
      console.error('❌ Migration failed:', err.message);
      process.exit(1);
    }
  } else {
    console.log('✅ Migration complete via RPC!');
  }
}

runMigration();
