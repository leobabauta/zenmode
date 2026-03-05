import { useState } from 'react';
import { usePlannerStore, selectItemsForDay } from '../../store/usePlannerStore';
import { toDayKey, formatDayLabel } from '../../lib/dates';
import { ItemList } from '../items/ItemList';
import { AddItemForm } from '../forms/AddItemForm';
import { PracticeBox } from '../ui/PracticeBox';
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

  const practiceItems = todayItems.filter((i) => i.isPractice);
  const nonPracticeItems = todayItems.filter((i) => !i.isPractice);

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
          {practiceItems.length > 0 && (
            <PracticeBox items={practiceItems} className="mb-2 ml-[24px] mr-[34px]" />
          )}
          <div className="min-h-[8px]">
            <ItemList items={nonPracticeItems} />
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
