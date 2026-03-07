-- Add missing columns to items table
ALTER TABLE items ADD COLUMN IF NOT EXISTS completed_at timestamptz DEFAULT NULL;
ALTER TABLE items ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;
ALTER TABLE items ADD COLUMN IF NOT EXISTS timer_sessions jsonb DEFAULT NULL;

-- Add missing column to user_preferences table
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS active_list_id text DEFAULT NULL;

-- Force PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
