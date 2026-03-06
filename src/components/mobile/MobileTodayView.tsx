import { usePlannerStore, selectItemsForDay } from '../../store/usePlannerStore';
import { toDayKey, formatDayLabel } from '../../lib/dates';
import { MobileTaskRow } from './MobileTaskRow';

export function MobileTodayView() {
  const items = usePlannerStore((s) => s.items);

  const today = new Date();
  const dayKey = toDayKey(today);
  const todayItems = selectItemsForDay(items, dayKey);
  const label = formatDayLabel(today);

  const practiceItems = todayItems.filter((i) => i.isPractice);
  const nonPracticeItems = todayItems.filter((i) => !i.isPractice);

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="flex items-baseline justify-between px-5 pt-6 pb-4">
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Today</h1>
        <span className="text-sm text-[var(--color-text-muted)]">{label}</span>
      </div>

      {/* Practice items */}
      {practiceItems.length > 0 && (
        <div className="mx-5 mb-3 px-4 py-2 rounded-lg bg-[var(--color-surface)]">
          <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-1">Practice</p>
          {practiceItems.map((item) => (
            <MobileTaskRow key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* Task list */}
      <div className="space-y-0.5">
        {nonPracticeItems.map((item) => (
          <MobileTaskRow key={item.id} item={item} />
        ))}
      </div>

      {/* Spacer for FAB */}
      <div className="h-24" />
    </div>
  );
}
