import { useEffect, useRef } from 'react';
import { AppShell } from './components/layout/AppShell';
import { MobileApp } from './components/mobile/MobileApp';
import { useIsMobile } from './hooks/useIsMobile';
import { usePlannerStore } from './store/usePlannerStore';
import { toDayKey, getWeekKey } from './lib/dates';
import { supabase } from './lib/supabase';
import { useAuthStore } from './store/useAuthStore';
import { pullFromSupabase, pullPreferences, flushPreferencesNow, flushChangedNow, flushDeletedNow, subscribeToRealtime } from './lib/sync';
import { silentRefreshCalendarToken } from './lib/googleCalendar';
import { LoginPage } from './components/auth/LoginPage';
import { ToastProvider } from './components/ui/Toast';
import { applyColorPreset } from './lib/colorThemes';

export default function App() {
  const isMobile = useIsMobile();
  const theme = usePlannerStore((s) => s.theme);
  const accentColor = usePlannerStore((s) => s.accentColor);
  const { user, loading: authLoading } = useAuthStore();
  const hasAutoMoved = useRef(false);
  const hasSynced = useRef(false);

  // Listen for auth state changes
  useEffect(() => {
    if (!supabase) {
      useAuthStore.getState().setLoading(false);
      return;
    }

    // Listen for auth changes — but guard against spurious SIGNED_OUT events
    // by attempting a session refresh before actually logging the user out
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' && !session) {
          // Before accepting sign-out, try refreshing the session one more time
          // (covers cases where the token expired but refresh token is still valid)
          const { data } = await supabase!.auth.refreshSession();
          if (data.session) {
            // Refresh succeeded — stay signed in
            useAuthStore.getState().setAuth(data.session.user, data.session);
            return;
          }
        }
        useAuthStore.getState().setAuth(session?.user ?? null, session);
      }
    );

    // Check existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        // No session found — try refreshing in case there's a valid refresh token
        const { data } = await supabase!.auth.refreshSession();
        if (data.session) {
          useAuthStore.getState().setAuth(data.session.user, data.session);
          return;
        }
      }
      if (useAuthStore.getState().loading) {
        useAuthStore.getState().setAuth(session?.user ?? null, session);
      }
    });

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

  const checkWeeklyPlanningRitual = () => {
    const state = usePlannerStore.getState();
    if (!state.weeklyPlanningEnabled) return;
    const now = new Date();
    const currentWeekKey = getWeekKey(now);
    if (state.lastWeeklyPlanningDate === currentWeekKey) return;
    if (now.getDay() !== state.weeklyPlanningDay) return;
    if (now.getHours() < state.weeklyPlanningHour) return;
    if (state.weeklyPlanningSnoozedUntil && Date.now() < state.weeklyPlanningSnoozedUntil) return;
    if (state.showWeeklyPlanningPrompt) return;
    if (state.view === 'weeklyPlanning') return;
    state.setShowWeeklyPlanningPrompt(true);
  };

  const checkWeeklyReviewRitual = () => {
    const state = usePlannerStore.getState();
    if (!state.weeklyReviewEnabled) return;
    const now = new Date();
    const currentWeekKey = getWeekKey(now);
    if (state.lastWeeklyReviewDate === currentWeekKey) return;
    if (now.getDay() !== state.weeklyReviewDay) return;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const targetMinutes = state.weeklyReviewHour * 60 + state.weeklyReviewMinute;
    if (currentMinutes < targetMinutes) return;
    if (state.weeklyReviewSnoozedUntil && Date.now() < state.weeklyReviewSnoozedUntil) return;
    if (state.showWeeklyReviewPrompt) return;
    if (state.view === 'weeklyReview') return;
    state.setShowWeeklyReviewPrompt(true);
  };

  const runStartupTasks = () => {
    const state = usePlannerStore.getState();
    state.autoMoveIncompleteItems();

    // Show onboarding for new users (skip if they already have items — existing user)
    if (!state.hasCompletedOnboarding) {
      if (Object.keys(state.items).length > 0) {
        usePlannerStore.setState({ hasCompletedOnboarding: true });
      } else {
        state.setView('onboarding');
        return;
      }
    }

    // Check if rituals should be prompted
    checkPlanningRitual();
    checkReviewRitual();
    checkWeeklyPlanningRitual();
    checkWeeklyReviewRitual();

    // Silently refresh Google Calendar token if previously connected
    if (state.googleCalendarConnected) {
      silentRefreshCalendarToken();
    }
  };

  // After store hydration: pull from Supabase first (if available), THEN auto-move + ritual checks.
  // This ensures remote items are merged before autoMoveIncompleteItems runs.
  useEffect(() => {
    if (hasAutoMoved.current) return;
    hasAutoMoved.current = true;

    const onHydrated = () => {
      if (supabase && user) {
        // Supabase available: pull remote data first, then run startup tasks
        if (!hasSynced.current) {
          hasSynced.current = true;
          pullFromSupabase()
            .then(() => pullPreferences())
            .then(() => {
              runStartupTasks();
              subscribeToRealtime(user.id);
            });
        }
      } else if (!supabase) {
        // No Supabase: run startup tasks immediately on local data
        runStartupTasks();
      }
      // If supabase exists but no user yet, the user-dependent effect below handles it
    };

    const unsub = usePlannerStore.persist.onFinishHydration(() => {
      onHydrated();
    });
    if (usePlannerStore.persist.hasHydrated()) {
      onHydrated();
    }
    return unsub;
  }, [user]);

  // Handle case where user logs in after hydration already happened
  useEffect(() => {
    if (!supabase || !user || hasSynced.current) return;
    if (!usePlannerStore.persist.hasHydrated()) return;

    hasSynced.current = true;
    pullFromSupabase()
      .then(() => pullPreferences())
      .then(() => {
        runStartupTasks();
        subscribeToRealtime(user.id);
      });
  }, [user]);

  // Flush all pending changes on page close
  useEffect(() => {
    const handler = () => {
      flushChangedNow();
      flushDeletedNow();
      flushPreferencesNow();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // Pull latest data when tab becomes visible again (e.g. switching between devices/tabs)
  useEffect(() => {
    if (!supabase || !user) return;
    const handler = () => {
      if (document.visibilityState === 'visible') {
        pullFromSupabase().then(() => pullPreferences());
        // Refresh calendar token silently if connected
        if (usePlannerStore.getState().googleCalendarConnected) {
          silentRefreshCalendarToken();
        }
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [user]);

  // 60-second interval to check if review ritual should trigger mid-session
  useEffect(() => {
    const interval = setInterval(() => {
      checkReviewRitual();
      checkWeeklyPlanningRitual();
      checkWeeklyReviewRitual();
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Sync theme class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Apply accent color preset CSS overrides
  useEffect(() => {
    applyColorPreset(accentColor, theme === 'dark');
  }, [accentColor, theme]);

  // Supabase configured but not logged in — show login
  if (supabase && !authLoading && !user) {
    return <LoginPage />;
  }

  // Still checking auth
  if (supabase && authLoading) {
    return null;
  }

  return (
    <ToastProvider>
      {isMobile ? <MobileApp /> : <AppShell />}
    </ToastProvider>
  );
}
