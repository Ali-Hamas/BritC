-- ─────────────────────────────────────────────────────────────
-- BritSync Assistant — Auto Reports Scheduler
-- Run this once in the Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS report_schedules (
  user_id      TEXT PRIMARY KEY,
  cadence      TEXT NOT NULL DEFAULT 'disabled'
               CHECK (cadence IN ('disabled', 'weekly', 'monthly')),
  enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  last_sent_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_schedules_cadence
  ON report_schedules(cadence) WHERE cadence != 'disabled';

CREATE TABLE IF NOT EXISTS report_sends (
  id        BIGSERIAL PRIMARY KEY,
  user_id   TEXT NOT NULL,
  cadence   TEXT NOT NULL,
  sent_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status    TEXT NOT NULL,
  error_msg TEXT
);

CREATE INDEX IF NOT EXISTS idx_report_sends_user_date
  ON report_sends(user_id, sent_at DESC);

ALTER TABLE report_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rs_read ON report_schedules;
CREATE POLICY rs_read ON report_schedules FOR SELECT USING (true);
DROP POLICY IF EXISTS rs_write ON report_schedules;
CREATE POLICY rs_write ON report_schedules FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE report_sends ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rsends_read ON report_sends;
CREATE POLICY rsends_read ON report_sends FOR SELECT USING (true);
DROP POLICY IF EXISTS rsends_write ON report_sends;
CREATE POLICY rsends_write ON report_sends FOR ALL USING (true) WITH CHECK (true);
