import { useEffect, useRef } from 'react';
import { AppShell } from './components/layout/AppShell';
import { usePlannerStore } from './store/usePlannerStore';
import { toDayKey } from './lib/dates';
import { supabase } from './lib/supabase';
import { useAuthStore } from './store/useAuthStore';
import { pullFromSupabase, pullPreferences } from './lib/sync';
import { LoginPage } from './components/auth/LoginPage';

export default function App() {
  const theme = usePlannerStore((s) => s.theme);
  const { user, loading: authLoading } = useAuthStore();
  const hasAutoMoved = useRef(false);
  const hasSynced = useRef(false);

  // Listen for auth state changes
  useEffect(() => {
    if (!supabase) {
      useAuthStore.getState().setLoading(false);
      return;
    }

    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      useAuthStore.getState().setAuth(session?.user ?? null, session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        useAuthStore.getState().setAuth(session?.user ?? null, session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Auto-move incomplete past tasks and check ritual after store hydration
  useEffect(() => {
    if (hasAutoMoved.current) return;
    hasAutoMoved.current = true;

    const runStartupTasks = () => {
      const state = usePlannerStore.getState();
      state.autoMoveIncompleteItems();

      // Check if daily ritual should be prompted
      const todayKey = toDayKey(new Date());
      const hour = new Date().getHours();
      if (state.lastRitualDate !== todayKey && hour >= 6) {
        state.setShowRitualPrompt(true);
      }
    };

    const unsub = usePlannerStore.persist.onFinishHydration(() => {
      runStartupTasks();
    });
    // If already hydrated, run immediately
    if (usePlannerStore.persist.hasHydrated()) {
      runStartupTasks();
    }
    return unsub;
  }, []);

  // Pull from Supabase after auth + hydration
  useEffect(() => {
    if (!supabase || !user || hasSynced.current) return;
    if (!usePlannerStore.persist.hasHydrated()) return;

    hasSynced.current = true;
    pullFromSupabase().then(() => pullPreferences());
  }, [user]);

  // Sync theme class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Supabase configured but not logged in — show login
  if (supabase && !authLoading && !user) {
    return <LoginPage />;
  }

  // Still checking auth
  if (supabase && authLoading) {
    return null;
  }

  return <AppShell />;
}
