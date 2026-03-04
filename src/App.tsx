import { useEffect, useRef } from 'react';
import { AppShell } from './components/layout/AppShell';
import { usePlannerStore } from './store/usePlannerStore';

export default function App() {
  const theme = usePlannerStore((s) => s.theme);
  const hasAutoMoved = useRef(false);

  // Auto-move incomplete past tasks after store hydration
  useEffect(() => {
    if (hasAutoMoved.current) return;
    hasAutoMoved.current = true;
    const unsub = usePlannerStore.persist.onFinishHydration(() => {
      usePlannerStore.getState().autoMoveIncompleteItems();
    });
    // If already hydrated, run immediately
    if (usePlannerStore.persist.hasHydrated()) {
      usePlannerStore.getState().autoMoveIncompleteItems();
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
