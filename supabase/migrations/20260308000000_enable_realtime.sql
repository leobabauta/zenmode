-- Enable Realtime for items and user_preferences tables
ALTER PUBLICATION supabase_realtime ADD TABLE items;
ALTER PUBLICATION supabase_realtime ADD TABLE user_preferences;
