import { useMemo } from 'react';
import { usePlannerStore, selectItemsForDay } from '../../store/usePlannerStore';
import { toDayKey, formatDayLabel } from '../../lib/dates';
import { MobileTaskRow } from './MobileTaskRow';

export function MobileTimelineView() {
  const items = usePlannerStore((s) => s.items);

  const days = useMemo(() => {
    const result: { dayKey: string; label: string; date: Date }[] = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      result.push({
        dayKey: toDayKey(d),
        label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : formatDayLabel(d),
        date: d,
      });
    }
    return result;
  }, []);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Timeline</h1>
      </div>

      {days.map(({ dayKey, label }) => {
        const dayItems = selectItemsForDay(items, dayKey);
        if (dayItems.length === 0) return null;
        return (
          <div key={dayKey} className="mb-4">
            <h2 className="px-5 text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
              {label}
            </h2>
            <div className="space-y-0.5">
              {dayItems.map((item) => (
                <MobileTaskRow key={item.id} item={item} />
              ))}
            </div>
          </div>
        );
      })}

      <div className="h-24" />
    </div>
  );
}
