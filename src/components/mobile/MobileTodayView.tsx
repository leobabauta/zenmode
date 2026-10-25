import { useMemo } from 'react';
import { usePlannerStore, selectItemsForDay } from '../../store/usePlannerStore';
import { toDayKey, formatDayLabel } from '../../lib/dates';
import { MobileTaskRow } from './MobileTaskRow';

export function MobileTodayView() {
  const items = usePlannerStore((s) => s.items);
  const autoAdvanceEnabled = usePlannerStore((s) => s.autoAdvanceEnabled);
  const showPastIncompleteInToday = usePlannerStore((s) => s.showPastIncompleteInToday);
  const setAutoAdvanceEnabled = usePlannerStore((s) => s.setAutoAdvanceEnabled);
  const setShowPastIncompleteInToday = usePlannerStore((s) => s.setShowPastIncompleteInToday);

  const today = new Date();
  const dayKey = toDayKey(today);
  const todayItems = selectItemsForDay(items, dayKey);
  const label = formatDayLabel(today);

  // When auto-advance is disabled and the section isn't hidden, surface past
  // incomplete tasks in a distinct section below today's items.
  const pastIncompleteItems = useMemo(() => {
    if (autoAdvanceEnabled || !showPastIncompleteInToday) return [];
    return Object.values(items)
      .filter(
        (i) =>
          i.dayKey !== null &&
          i.dayKey < dayKey &&
          !i.completed &&
          !i.isLater &&
          !i.parentId &&
          !i.isArchived &&
          i.type !== 'note',
      )
      .sort((a, b) => (b.dayKey || '').localeCompare(a.dayKey || ''));
  }, [items, autoAdvanceEnabled, showPastIncompleteInToday, dayKey]);

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="flex items-baseline justify-between px-5 pt-6 pb-4">
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Today</h1>
        <span className="text-sm text-[var(--color-text-muted)]">{label}</span>
      </div>

      {/* Task list */}
      <div className="space-y-0.5">
        {todayItems.map((item) => (
          <MobileTaskRow key={item.id} item={item} />
        ))}
      </div>

      {/* Past incomplete items */}
      {pastIncompleteItems.length > 0 && (
        <div className="mt-6 px-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
            Past unfinished ({pastIncompleteItems.length})
          </h3>
          <div className="space-y-0.5">
            {pastIncompleteItems.map((item) => (
              <MobileTaskRow key={item.id} item={item} />
            ))}
          </div>
          <div className="mt-4 flex gap-3 text-xs">
            <button
              onClick={() => setShowPastIncompleteInToday(false)}
              className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              Hide from Today
            </button>
            <button
              onClick={() => setAutoAdvanceEnabled(true)}
              className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              Turn on auto-advance
            </button>
          </div>
        </div>
      )}

      {/* Spacer for FAB */}
      <div className="h-24" />
    </div>
  );
}
