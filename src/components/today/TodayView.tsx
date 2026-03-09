import { useState } from 'react';
import { usePlannerStore, selectItemsForDay } from '../../store/usePlannerStore';
import { toDayKey, getWeekKey } from '../../lib/dates';
import { ItemList } from '../items/ItemList';
import { AddItemForm } from '../forms/AddItemForm';
import { PracticeBox } from '../ui/PracticeBox';
import { SortArchiveButtons } from '../ui/SortArchiveButtons';
import { GreetingBanner } from '../ui/GreetingBanner';
import { AllDoneToday } from '../ui/EmptyState';

export function TodayView() {
  const items = usePlannerStore((s) => s.items);
  const setView = usePlannerStore((s) => s.setView);
  const weeklyPlans = usePlannerStore((s) => s.weeklyPlans);
  const reviewRitualEnabled = usePlannerStore((s) => s.reviewRitualEnabled);
  const lastReviewRitualDate = usePlannerStore((s) => s.lastReviewRitualDate);
  const reviewRitualSnoozedUntil = usePlannerStore((s) => s.reviewRitualSnoozedUntil);
  const reviewRitualHour = usePlannerStore((s) => s.reviewRitualHour);
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);

  const today = new Date();
  const dayKey = toDayKey(today);
  const todayItems = selectItemsForDay(items, dayKey);
  const hasWeekPlan = !!weeklyPlans[getWeekKey(today)];

  // Show Daily Review button when ritual is enabled, not completed for today,
  // and either snoozed or past the trigger hour
  const isSnoozed = reviewRitualSnoozedUntil !== null && reviewRitualSnoozedUntil > Date.now();
  const isPastTriggerHour = today.getHours() >= reviewRitualHour;
  const showReviewButton = reviewRitualEnabled && lastReviewRitualDate !== dayKey && (isSnoozed || isPastTriggerHour);

  const practiceItems = todayItems.filter((i) => i.isPractice);
  const nonPracticeItems = todayItems.filter((i) => !i.isPractice);

  // Check if all tasks are completed — use raw items (same logic as AppShell confetti)
  let totalTasks = 0;
  let doneTasks = 0;
  for (const item of Object.values(items)) {
    if (item.type !== 'task' || item.parentId || item.isArchived || item.dayKey !== dayKey) continue;
    totalTasks++;
    if (item.completed) doneTasks++;
  }
  const allTasksDone = totalTasks > 0 && doneTasks === totalTasks;
  const showAllDone = allTasksDone && !showCompletedTasks;

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
          {showReviewButton && (
            <button
              onClick={() => setView('review')}
              className="flex items-center gap-1.5 ml-[24px] mb-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <span>Daily Review</span>
            </button>
          )}
          {showAllDone ? (
            <AllDoneToday onShowCompleted={() => setShowCompletedTasks(true)} />
          ) : (
            <>
              {practiceItems.length > 0 && (
                <PracticeBox items={practiceItems} className="mb-2 ml-[24px] mr-[34px]" />
              )}
              <div className="min-h-[8px]">
                <ItemList items={nonPracticeItems} />
              </div>
              <AddItemForm dayKey={dayKey} className="mt-1" />
              <SortArchiveButtons items={todayItems} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
