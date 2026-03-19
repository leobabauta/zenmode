-- Add accent_color column if missing
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS accent_color text DEFAULT NULL;

-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
