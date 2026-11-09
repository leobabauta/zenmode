-- These three were listed in the web client's PREF_KEYS, so changing one
-- triggered a preferences push -- but none had a column here and none was in
-- the pushed payload, so they silently stayed per-browser. Two computers signed
-- into the same account therefore disagreed about whether Today shows the
-- "Past unfinished" section, which reads as tasks reappearing after switching
-- machines.
--
-- Nullable with no default: a null means "this account has never written the
-- setting", and the client falls back to its own value rather than being reset
-- to a server-side default it never chose.
alter table public.user_preferences
  add column if not exists auto_advance_enabled boolean,
  add column if not exists auto_advance_later_days integer,
  add column if not exists show_past_incomplete_in_today boolean;
