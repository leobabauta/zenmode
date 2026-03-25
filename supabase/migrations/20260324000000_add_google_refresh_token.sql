-- Store Google refresh token for server-side Calendar API token renewal
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS google_refresh_token text DEFAULT NULL;
NOTIFY pgrst, 'reload schema';
