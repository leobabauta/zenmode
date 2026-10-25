-- Two-way Asana sync: mirror columns on items, plus sync state and exclusions.
-- See docs/asana-sync.md. All columns are nullable and additive; rows for users
-- other than the one being synced keep NULL in every one of them.

ALTER TABLE items
  ADD COLUMN IF NOT EXISTS asana_gid text,
  ADD COLUMN IF NOT EXISTS asana_permalink text,
  ADD COLUMN IF NOT EXISTS asana_name text,
  ADD COLUMN IF NOT EXISTS asana_due_on date,
  ADD COLUMN IF NOT EXISTS asana_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS asana_completed boolean,
  ADD COLUMN IF NOT EXISTS asana_day_key text,
  ADD COLUMN IF NOT EXISTS completion_note text,
  ADD COLUMN IF NOT EXISTS completion_note_posted_at timestamptz,
  ADD COLUMN IF NOT EXISTS asana_sync_error text,
  ADD COLUMN IF NOT EXISTS asana_synced_at timestamptz;

-- asana_day_key is NOT "the day both systems agree on" -- once a rollover
-- advances it, Zenmode's placement and Asana's due_on legitimately differ. It
-- means "where Zenmode put this on its own." A divergence between day_key and
-- asana_day_key is therefore the signal that Leo moved the task by hand, which
-- is the only case that pushes a new due date to Asana. Rollover must advance
-- both in one UPDATE so it never looks like a user move.
COMMENT ON COLUMN items.asana_day_key IS
  'Day Zenmode placed this task without user intent. day_key <> asana_day_key means the user moved it; that is the push signal.';

-- Asana-side date detection compares against these, never against asana_day_key.
COMMENT ON COLUMN items.asana_due_on IS 'Last known Asana due date, for detecting Asana-side changes.';

COMMENT ON COLUMN items.completion_note_posted_at IS
  'Set once the note has been posted to Asana, so a retry cannot double-post it.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_items_user_asana_gid
  ON items (user_id, asana_gid)
  WHERE asana_gid IS NOT NULL;

-- Sync run state, one row per synced user.
CREATE TABLE IF NOT EXISTS asana_sync_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_pull_at timestamptz,
  last_reconcile_at timestamptz,
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Asana task names never to pull in. Matched case-insensitively with ILIKE,
-- so entries may use % wildcards.
CREATE TABLE IF NOT EXISTS asana_sync_exclusions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT asana_sync_exclusions_unique_pattern UNIQUE (user_id, pattern)
);

CREATE INDEX IF NOT EXISTS idx_asana_sync_exclusions_user_id
  ON asana_sync_exclusions (user_id);

ALTER TABLE asana_sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE asana_sync_exclusions ENABLE ROW LEVEL SECURITY;

-- Read-only for the owner by design. All writes go through the edge functions
-- on the service role, which bypasses RLS -- there are deliberately no INSERT,
-- UPDATE or DELETE policies here.
CREATE POLICY "Users can view own asana sync state"
  ON asana_sync_state FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own asana sync exclusions"
  ON asana_sync_exclusions FOR SELECT
  USING (auth.uid() = user_id);

-- Seed the standing exclusions. The daily checkin ("What did you work on
-- today?") is deliberately absent: the sync now owns placing it in Zenmode.
INSERT INTO asana_sync_exclusions (user_id, pattern)
SELECT u.id, p.pattern
FROM auth.users u
CROSS JOIN (VALUES
  ('What will you be working on this week?'),
  ('%FMP Weekly Call%'),
  ('%Post Friday victories thread%')
) AS p(pattern)
WHERE u.email = 'leo.babauta@gmail.com'
ON CONFLICT (user_id, pattern) DO NOTHING;

INSERT INTO asana_sync_state (user_id)
SELECT id FROM auth.users WHERE email = 'leo.babauta@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
