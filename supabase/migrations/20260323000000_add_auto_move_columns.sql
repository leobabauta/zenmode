-- Add timezone and last_auto_move_date to user_preferences for server-side auto-move
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS timezone text DEFAULT NULL;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS last_auto_move_date text DEFAULT NULL;
NOTIFY pgrst, 'reload schema';
