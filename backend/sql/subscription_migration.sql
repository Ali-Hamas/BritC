-- ─────────────────────────────────────────────────────────────────────────────
-- subscription_migration — add Stripe columns to account_subscriptions,
-- add referral_required status to account_approvals, and shift ALL existing
-- users to the Free plan.
--
-- Free plan: 1 team chat, 0 GB storage, no AI skills
-- Enterprise (£449/mo): unlimited team chats, 64 GB storage, all AI skills
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add referral_required to account_approvals status check
ALTER TABLE account_approvals DROP CONSTRAINT IF EXISTS account_approvals_status_check;
ALTER TABLE account_approvals ADD CONSTRAINT account_approvals_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'referral_required'));

-- 2. Add Stripe columns to account_subscriptions
ALTER TABLE account_subscriptions ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE account_subscriptions ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE account_subscriptions ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none'
  CHECK (subscription_status IN ('none', 'trialing', 'active', 'past_due', 'canceled', 'expired'));
ALTER TABLE account_subscriptions ADD COLUMN IF NOT EXISTS storage_used BIGINT DEFAULT 0;
ALTER TABLE account_subscriptions ADD COLUMN IF NOT EXISTS billing_cycle_start TIMESTAMPTZ;
ALTER TABLE account_subscriptions ADD COLUMN IF NOT EXISTS billing_cycle_end TIMESTAMPTZ;

-- 3. Shift ALL existing users to free plan
UPDATE account_subscriptions SET plan = 'free', source = 'backfill_migrated';

-- 4. RLS policies (already exist, but ensure they cover new columns)
-- No changes needed — RLS is on the row level, not column level.
