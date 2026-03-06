import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

/**
 * Initialize the shared Supabase client. Call once at app startup.
 * Pass platform-specific options (e.g. AsyncStorage for React Native).
 */
export function initSupabase(
  url: string,
  anonKey: string,
  options?: { authStorage?: any },
): SupabaseClient {
  _supabase = createClient(url, anonKey, options?.authStorage ? {
    auth: { storage: options.authStorage, autoRefreshToken: true, persistSession: true },
  } : undefined);
  return _supabase;
}

export function getSupabase(): SupabaseClient | null {
  return _supabase;
}
