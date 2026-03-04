import { usePlannerStore, selectItemsForDay } from '../../store/usePlannerStore';
import { toDayKey, formatDayLabel } from '../../lib/dates';
import { ItemList } from '../items/ItemList';
import { AddItemForm } from '../forms/AddItemForm';

export function TodayView() {
  const items = usePlannerStore((s) => s.items);

  const today = new Date();
  const dayKey = toDayKey(today);
  const todayItems = selectItemsForDay(items, dayKey);
  const label = formatDayLabel(today);
  const [dayPart, datePart] = label.split(', ');

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col items-center mb-4">
          <span className="text-lg font-bold uppercase tracking-wider text-blue-400">
            Today
          </span>
          <span className="text-xs text-[var(--color-text-muted)]">
            {dayPart}, {datePart}
          </span>
        </div>

        <div className="rounded-xl p-3 min-h-[80px]">
          <div className="min-h-[8px]">
            <ItemList items={todayItems} />
          </div>
          <AddItemForm dayKey={dayKey} className="mt-1" />
        </div>
      </div>
    </div>
  );
}
