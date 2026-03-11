import { usePlannerStore, selectItemsForDay } from '../../store/usePlannerStore';
import { toDayKey, formatDayLabel } from '../../lib/dates';
import { MobileTaskRow } from './MobileTaskRow';

export function MobileTodayView() {
  const items = usePlannerStore((s) => s.items);

  const today = new Date();
  const dayKey = toDayKey(today);
  const todayItems = selectItemsForDay(items, dayKey);
  const label = formatDayLabel(today);

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

      {/* Spacer for FAB */}
      <div className="h-24" />
    </div>
  );
}
