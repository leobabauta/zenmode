import { useState } from 'react';
import { usePlannerStore, selectItemsForDay } from '../../store/usePlannerStore';
import { toDayKey, formatDayLabel } from '../../lib/dates';
import { ItemList } from '../items/ItemList';
import { AddItemForm } from '../forms/AddItemForm';
import { CalendarImportModal } from './CalendarImportModal';

const hasGoogleClientId = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

export function TodayView() {
  const items = usePlannerStore((s) => s.items);
  const [showCalendarImport, setShowCalendarImport] = useState(false);

  const today = new Date();
  const dayKey = toDayKey(today);
  const todayItems = selectItemsForDay(items, dayKey);
  const label = formatDayLabel(today);
  const [dayPart, datePart] = label.split(', ');

  const priorityItems = todayItems.filter((i) => i.isPriority);
  const mediumPriorityItems = todayItems.filter((i) => i.isMediumPriority && !i.isPriority);
  const practiceItems = todayItems.filter((i) => i.isPractice);
  const regularItems = todayItems.filter((i) => !i.isPriority && !i.isMediumPriority && !i.isPractice);

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

        {/* Priorities section */}
        {priorityItems.length > 0 && (
          <div className="mb-4 rounded-xl border border-blue-500/30 bg-blue-500/5 p-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-2 block">
              Priorities
            </span>
            <ItemList items={priorityItems} />
          </div>
        )}

        {/* Medium priorities section */}
        {mediumPriorityItems.length > 0 && (
          <div className="mb-4 rounded-xl border border-slate-400/30 bg-slate-400/5 p-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 block">
              Medium Priorities
            </span>
            <ItemList items={mediumPriorityItems} />
          </div>
        )}

        {/* Practice section */}
        {practiceItems.length > 0 && (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-2 block">
              Practice
            </span>
            <ItemList items={practiceItems} />
          </div>
        )}

        <div className="rounded-xl p-3 min-h-[80px]">
          <div className="min-h-[8px]">
            <ItemList items={regularItems} />
          </div>
          <AddItemForm dayKey={dayKey} className="mt-1" />
          {hasGoogleClientId && (
            <button
              onClick={() => setShowCalendarImport(true)}
              className="mt-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              Import from Google Calendar
            </button>
          )}
        </div>
      </div>
      <CalendarImportModal
        open={showCalendarImport}
        onClose={() => setShowCalendarImport(false)}
      />
    </div>
  );
}
