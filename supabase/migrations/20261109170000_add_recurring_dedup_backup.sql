-- Snapshot taken before the first healthy run of auto-move-items' recurring
-- dedup pass. The rollover was unreachable for ~8 months (pg_cron sent a
-- legacy service-role JWT that stopped matching the runtime key), and its
-- dedup deletes were additionally failing with "Bad Request" because
-- `in('id', ids)` overflowed the request line for large id sets. Re-enabling
-- both removes ~2k duplicate recurring rows in one pass, so the full contents
-- of every affected duplicate group are copied here first.
--
-- Safe to drop once the dedup result has been reviewed.
create table if not exists public.recurring_dedup_backup_20261109 (
  id text primary key,
  user_id uuid not null,
  row_data jsonb not null,
  backed_up_at timestamptz not null default now()
);

-- No policies: service role only. Without RLS the publishable key could read
-- every user's task text through PostgREST.
alter table public.recurring_dedup_backup_20261109 enable row level security;
