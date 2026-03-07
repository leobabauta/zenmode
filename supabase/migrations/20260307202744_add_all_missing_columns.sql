-- items table: add all columns the app expects
ALTER TABLE items ADD COLUMN IF NOT EXISTS is_medium_priority boolean DEFAULT false;
ALTER TABLE items ADD COLUMN IF NOT EXISTS is_practice boolean DEFAULT false;
ALTER TABLE items ADD COLUMN IF NOT EXISTS consecutive_moves integer DEFAULT 0;
ALTER TABLE items ADD COLUMN IF NOT EXISTS is_priority boolean DEFAULT false;
ALTER TABLE items ADD COLUMN IF NOT EXISTS list_id text DEFAULT NULL;
ALTER TABLE items ADD COLUMN IF NOT EXISTS completed_at timestamptz DEFAULT NULL;
ALTER TABLE items ADD COLUMN IF NOT EXISTS timer_sessions jsonb DEFAULT NULL;
ALTER TABLE items ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;
ALTER TABLE items ADD COLUMN IF NOT EXISTS notes text DEFAULT NULL;
ALTER TABLE items ADD COLUMN IF NOT EXISTS parent_id text DEFAULT NULL;
ALTER TABLE items ADD COLUMN IF NOT EXISTS recurrence jsonb DEFAULT NULL;
ALTER TABLE items ADD COLUMN IF NOT EXISTS is_later boolean DEFAULT false;

-- user_preferences table: add all columns the app expects
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS custom_lists jsonb DEFAULT '[]';
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS active_list_id text DEFAULT NULL;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS active_hashtag text DEFAULT NULL;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS sidebar_collapsed boolean DEFAULT false;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS label_colors jsonb DEFAULT '{}';
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS last_ritual_date text DEFAULT NULL;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS planning_ritual_enabled boolean DEFAULT false;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS planning_ritual_hour integer DEFAULT 7;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS review_ritual_enabled boolean DEFAULT false;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS review_ritual_hour integer DEFAULT 17;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS last_review_ritual_date text DEFAULT NULL;

-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
