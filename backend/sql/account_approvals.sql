-- ─────────────────────────────────────────────────────────────────────────────
-- account_approvals — admin approval gate for new signups.
--
-- Sibling table to Better-Auth's "user" table (we don't alter Better-Auth's
-- schema). Each user has exactly one row; status drives whether they may
-- access the app. Existing users are auto-approved on first migration.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS account_approvals (
  user_id     TEXT PRIMARY KEY,
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'approved', 'rejected')),
  decided_by  TEXT,
  decided_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_account_approvals_status
  ON account_approvals(status, created_at DESC);

-- Backfill: every existing Better-Auth user is auto-approved so no one
-- gets locked out by the migration.
INSERT INTO account_approvals (user_id, status, decided_at)
SELECT id, 'approved', NOW() FROM "user"
ON CONFLICT (user_id) DO NOTHING;

-- RLS: read open (the frontend probes its own status); writes are server-side
-- only — the backend uses the service-role pg connection, not the anon key.
ALTER TABLE account_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS account_approvals_read ON account_approvals;
CREATE POLICY account_approvals_read
  ON account_approvals
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS account_approvals_write ON account_approvals;
CREATE POLICY account_approvals_write
  ON account_approvals
  FOR ALL
  USING (true)
  WITH CHECK (true);
