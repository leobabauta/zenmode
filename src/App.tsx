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

  const checkPlanningRitual = () => {
    const state = usePlannerStore.getState();
    if (!state.planningRitualEnabled) return;
    const todayKey = toDayKey(new Date());
    const hour = new Date().getHours();
    if (state.lastRitualDate === todayKey) return;
    if (hour < state.planningRitualHour) return;
    if (state.planningRitualSnoozedUntil && Date.now() < state.planningRitualSnoozedUntil) return;
    if (state.showRitualPrompt) return;
    if (state.view === 'ritual') return;
    state.setShowRitualPrompt(true);
  };

  const checkReviewRitual = () => {
    const state = usePlannerStore.getState();
    if (!state.reviewRitualEnabled) return;
    const todayKey = toDayKey(new Date());
    const hour = new Date().getHours();
    if (state.lastReviewRitualDate === todayKey) return;
    if (hour < state.reviewRitualHour) return;
    if (state.reviewRitualSnoozedUntil && Date.now() < state.reviewRitualSnoozedUntil) return;
    if (state.showReviewRitualPrompt) return;
    if (state.view === 'review') return;
    state.setShowReviewRitualPrompt(true);
  };

  // Auto-move incomplete past tasks and check ritual after store hydration
  useEffect(() => {
    if (hasAutoMoved.current) return;
    hasAutoMoved.current = true;

    const runStartupTasks = () => {
      const state = usePlannerStore.getState();
      state.autoMoveIncompleteItems();

      // Check if rituals should be prompted
      checkPlanningRitual();
      checkReviewRitual();
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

  // 60-second interval to check if review ritual should trigger mid-session
  useEffect(() => {
    const interval = setInterval(checkReviewRitual, 60_000);
    return () => clearInterval(interval);
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
