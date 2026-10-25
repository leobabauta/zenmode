-- Push side of the two-way Asana sync: an audit log, and the trigger that
-- invokes the asana-push edge function. See docs/asana-sync.md.

-- Every push attempt, dry or real, lands here. asana-push mutates state Leo's
-- team sees -- a due date Diana and Amanda are working to -- so there is a
-- record of what was sent and when, separate from the per-row asana_sync_error.
CREATE TABLE IF NOT EXISTS asana_push_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id text,
  asana_gid text,
  action text NOT NULL,
  payload jsonb,
  dry_run boolean NOT NULL DEFAULT true,
  status text NOT NULL,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_asana_push_log_user_created
  ON asana_push_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_asana_push_log_item
  ON asana_push_log (item_id);

ALTER TABLE asana_push_log ENABLE ROW LEVEL SECURITY;

-- Owner-read only; the edge function writes on the service role, which bypasses
-- RLS. No INSERT/UPDATE/DELETE policies on purpose.
CREATE POLICY "Users can view own asana push log"
  ON asana_push_log FOR SELECT
  USING (auth.uid() = user_id);

/*
 * Invoke asana-push for one row.
 *
 * The bearer token is read from Vault rather than inlined, so it is not
 * readable from pg_catalog the way a key pasted into a cron command is.
 *
 * Every failure path returns normally. This runs inside the user's own write
 * transaction: raising here would fail the UPDATE that the app -- or a sync
 * pull -- was performing, turning a sync problem into data loss. A push that
 * never fires is recovered by the hourly reconcile, which looks for rows where
 * day_key and asana_day_key disagree.
 */
CREATE OR REPLACE FUNCTION public.asana_push_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_secret text;
BEGIN
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'asana_sync_secret';

  IF v_secret IS NULL THEN
    RAISE WARNING 'asana_push_trigger: vault secret "asana_sync_secret" is missing; push skipped for item %', NEW.id;
    RETURN NULL;
  END IF;

  PERFORM net.http_post(
    url := 'https://hlyxiyvqmfupyqjgfajj.supabase.co/functions/v1/asana-push',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_secret,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('item_id', NEW.id)
  );

  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'asana_push_trigger failed for item %: %', NEW.id, SQLERRM;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS items_asana_push ON items;

-- Fires for ON CONFLICT DO UPDATE as well, which matters: the client only ever
-- reaches Supabase through upsert, never a plain UPDATE.
--
-- asana-push writes only asana_* columns and completion_note_posted_at, none of
-- which appear in this condition, so its own writes cannot re-fire the trigger.
CREATE TRIGGER items_asana_push
AFTER UPDATE ON items
FOR EACH ROW
WHEN (
  NEW.asana_gid IS NOT NULL
  AND (
    OLD.completed IS DISTINCT FROM NEW.completed
    OR OLD.day_key IS DISTINCT FROM NEW.day_key
  )
)
EXECUTE FUNCTION public.asana_push_trigger();

NOTIFY pgrst, 'reload schema';
