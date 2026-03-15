-- Add reminder_at column for timed reminders
ALTER TABLE items ADD COLUMN IF NOT EXISTS reminder_at timestamptz DEFAULT NULL;

-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
