-- ─────────────────────────────────────────────────────────────────────────────
-- plans_and_referrals — subscription plan tracking + admin-issued referral
-- tokens that bypass the manual approval gate.
--
-- account_subscriptions: one row per user, default 'free'. Enterprise (£480/mo)
-- unlocks every skill; free is restricted to owner-only Team Chat.
--
-- referral_tokens: single-use opaque tokens minted by admins. When a new user
-- signs up with a valid unused token, they are auto-approved AND auto-upgraded
-- to enterprise (the use-case is gifting full access to invited partners).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS account_subscriptions (
  user_id     TEXT PRIMARY KEY,
  plan        TEXT NOT NULL DEFAULT 'free'
              CHECK (plan IN ('free', 'enterprise')),
  source      TEXT,           -- 'signup' | 'referral' | 'admin' | 'payment'
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_account_subscriptions_plan
  ON account_subscriptions(plan);

-- Backfill: every existing user defaults to 'free' so the migration is safe.
INSERT INTO account_subscriptions (user_id, plan, source)
SELECT id, 'free', 'backfill' FROM "user"
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE account_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS account_subscriptions_read ON account_subscriptions;
CREATE POLICY account_subscriptions_read
  ON account_subscriptions
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS account_subscriptions_write ON account_subscriptions;
CREATE POLICY account_subscriptions_write
  ON account_subscriptions
  FOR ALL
  USING (true)
  WITH CHECK (true);


CREATE TABLE IF NOT EXISTS referral_tokens (
  token        TEXT PRIMARY KEY,
  created_by   TEXT NOT NULL,           -- admin user_id
  note         TEXT,                    -- optional label for the admin's reference
  used_by      TEXT,                    -- user_id who consumed the token
  used_email   TEXT,                    -- email captured at consumption (audit trail)
  used_at      TIMESTAMPTZ,
  revoked_at   TIMESTAMPTZ,             -- admin can disable an unused token
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_tokens_unused
  ON referral_tokens(created_at DESC)
  WHERE used_at IS NULL AND revoked_at IS NULL;

ALTER TABLE referral_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS referral_tokens_read ON referral_tokens;
CREATE POLICY referral_tokens_read
  ON referral_tokens
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS referral_tokens_write ON referral_tokens;
CREATE POLICY referral_tokens_write
  ON referral_tokens
  FOR ALL
  USING (true)
  WITH CHECK (true);
