import { usePlannerStore, selectItemsForDay } from '../../store/usePlannerStore';
import { toDayKey, getWeekKey } from '../../lib/dates';
import { ItemList } from '../items/ItemList';
import { AddItemForm } from '../forms/AddItemForm';
import { PracticeBox } from '../ui/PracticeBox';
import { SortArchiveButtons } from '../ui/SortArchiveButtons';
import { GreetingBanner } from '../ui/GreetingBanner';

export function TodayView() {
  const items = usePlannerStore((s) => s.items);
  const sortCompletedToTop = usePlannerStore((s) => s.sortCompletedToTop);
  const setView = usePlannerStore((s) => s.setView);
  const weeklyPlans = usePlannerStore((s) => s.weeklyPlans);

  const today = new Date();
  const dayKey = toDayKey(today);
  const todayItems = selectItemsForDay(items, dayKey);
  const hasWeekPlan = !!weeklyPlans[getWeekKey(today)];

  const practiceItems = todayItems.filter((i) => i.isPractice);
  const nonPracticeItems = todayItems.filter((i) => !i.isPractice);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      <div className="max-w-2xl mx-auto">
        <div className="rounded-xl p-3 min-h-[80px]">
          <div className="ml-[24px] mr-[34px]">
            <GreetingBanner />
          </div>
          {hasWeekPlan && (
            <button
              onClick={() => setView('weekPlan')}
              className="flex items-center gap-1.5 ml-[24px] mb-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span>Week's Plan</span>
            </button>
          )}
          {practiceItems.length > 0 && (
            <PracticeBox items={practiceItems} className="mb-2 ml-[24px] mr-[34px]" />
          )}
          <div className="min-h-[8px]">
            <ItemList items={nonPracticeItems} />
          </div>
          <AddItemForm dayKey={dayKey} className="mt-1" />
          <SortArchiveButtons
            items={todayItems}
            onSort={() => sortCompletedToTop({ dayKey })}
          />
        </div>
      </div>
    </div>
  );
}
