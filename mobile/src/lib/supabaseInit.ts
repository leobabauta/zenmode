import AsyncStorage from '@react-native-async-storage/async-storage';
import { initSupabase } from '../../shared/lib/supabase';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export function setupSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('Supabase credentials not configured');
    return null;
  }
  return initSupabase(SUPABASE_URL, SUPABASE_ANON_KEY, {
    authStorage: AsyncStorage,
  });
}
