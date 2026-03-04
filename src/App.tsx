import { useEffect, useRef } from 'react';
import { AppShell } from './components/layout/AppShell';
import { usePlannerStore } from './store/usePlannerStore';
import { toDayKey } from './lib/dates';

export default function App() {
  const theme = usePlannerStore((s) => s.theme);
  const hasAutoMoved = useRef(false);

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

  // Sync theme class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  return <AppShell />;
}
