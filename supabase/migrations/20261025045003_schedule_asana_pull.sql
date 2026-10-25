-- Run asana-pull every 5 minutes. See docs/asana-sync.md.
--
-- The bearer token is read from Vault, not inlined: this command is readable by
-- anyone who can select from cron.job, and the two older jobs in this database
-- have their service role key sitting in plain sight there.
--
-- Do NOT authenticate this with current_setting('supabase.service_role_key').
-- That parameter does not exist on this project, so the command raises inside
-- Postgres before the HTTP call is made -- silently, every run, forever. A
-- duplicate auto-move-items job did exactly that until it was removed on
-- 2026-10-24, having failed all 24 of its last 24 runs while looking healthy.
--
-- timeout_milliseconds is generous because the hourly reconcile pass inside
-- asana-pull makes one Asana request per open linked row. pg_net only waits for
-- the response; the function finishes regardless, but a short timeout fills
-- net._http_response with errors for runs that actually succeeded.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'asana-pull-5min') THEN
    PERFORM cron.unschedule('asana-pull-5min');
  END IF;
END $$;

SELECT cron.schedule(
  'asana-pull-5min',
  '*/5 * * * *',
  $job$
  SELECT net.http_post(
    url := 'https://hlyxiyvqmfupyqjgfajj.supabase.co/functions/v1/asana-pull',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets
        WHERE name = 'asana_sync_secret'
      ),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $job$
);
