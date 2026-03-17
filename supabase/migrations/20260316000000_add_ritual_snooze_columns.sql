-- Add snooze timestamp columns for ritual prompts (synced across devices)
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS planning_ritual_snoozed_until bigint DEFAULT NULL;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS review_ritual_snoozed_until bigint DEFAULT NULL;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS weekly_planning_snoozed_until bigint DEFAULT NULL;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS weekly_review_snoozed_until bigint DEFAULT NULL;

-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
