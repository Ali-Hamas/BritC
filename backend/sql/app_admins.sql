-- ─────────────────────────────────────────────────────────────────────────────
-- app_admins — runtime-mutable platform admin list.
--
-- The hardcoded GLOBAL_MODERATOR_EMAILS in team.ts remain as "superadmins"
-- (always admin, immune to demotion). This table lets the platform owner
-- promote any other user to admin from the AdminPanel UI without redeploying.
--
-- Rows are simple: one user_id per row. Permission = "exists in this table".
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS app_admins (
  user_id    TEXT PRIMARY KEY,
  granted_by TEXT,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: open read for authenticated requests so the AdminPanel and the
-- client-side cache can list admins. Writes are gated client-side by the
-- moderator check (and the hardcoded superadmin list). For v1 we accept
-- this; v2 will move writes to a server endpoint with token verification.
ALTER TABLE app_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_admins_read_all ON app_admins;
CREATE POLICY app_admins_read_all
  ON app_admins
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS app_admins_write_all ON app_admins;
CREATE POLICY app_admins_write_all
  ON app_admins
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_app_admins_granted_at ON app_admins(granted_at DESC);
