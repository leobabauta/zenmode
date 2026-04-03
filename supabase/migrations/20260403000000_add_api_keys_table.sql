-- API keys for programmatic access to zenmode items
CREATE TABLE api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  key_hash text NOT NULL,
  key_prefix text NOT NULL,
  scope text NOT NULL DEFAULT 'items:read',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  CONSTRAINT valid_scope CHECK (scope IN ('items:read', 'items:write'))
);

CREATE INDEX idx_api_keys_key_hash ON api_keys (key_hash);
CREATE INDEX idx_api_keys_user_id ON api_keys (user_id);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own api keys"
  ON api_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own api keys"
  ON api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own api keys"
  ON api_keys FOR DELETE
  USING (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
