import { useState, useMemo, useEffect } from 'react';
import { usePlannerStore, selectItemsForDay } from '../../store/usePlannerStore';
import { toDayKey } from '../../lib/dates';
import { ItemList } from '../items/ItemList';
import { AddItemForm } from '../forms/AddItemForm';
import { SortArchiveButtons } from '../ui/SortArchiveButtons';
import { GreetingBanner } from '../ui/GreetingBanner';
import { AllDoneToday } from '../ui/EmptyState';
import { CopyButton } from '../ui/CopyButton';

export function TodayView() {
  const items = usePlannerStore((s) => s.items);
  const setView = usePlannerStore((s) => s.setView);
  const reviewRitualEnabled = usePlannerStore((s) => s.reviewRitualEnabled);
  const lastReviewRitualDate = usePlannerStore((s) => s.lastReviewRitualDate);
  const reviewRitualSnoozedUntil = usePlannerStore((s) => s.reviewRitualSnoozedUntil);
  const reviewRitualHour = usePlannerStore((s) => s.reviewRitualHour);
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);

  const today = new Date();
  const dayKey = toDayKey(today);
  const todayItems = selectItemsForDay(items, dayKey);
  const startSelection = usePlannerStore((s) => s.startSelection);

  // Auto-select first incomplete task on mount
  useEffect(() => {
    const firstIncomplete = todayItems.find((i) => i.type === 'task' && !i.completed);
    if (firstIncomplete) {
      startSelection(firstIncomplete.id);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Find the daily review note for today (contains #dailyreview)
  const reviewNote = useMemo(() => {
    return Object.values(items).find(
      (i) => i.type === 'note' && i.dayKey === dayKey && !i.isArchived && i.text.includes('#dailyreview')
    );
  }, [items, dayKey]);

  // Show Daily Review button when ritual is enabled, not completed for today,
  // and either snoozed or past the trigger hour
  const isSnoozed = reviewRitualSnoozedUntil !== null && reviewRitualSnoozedUntil > Date.now();
  const isPastTriggerHour = today.getHours() >= reviewRitualHour;
  const showReviewButton = reviewRitualEnabled && lastReviewRitualDate !== dayKey && (isSnoozed || isPastTriggerHour);

  // Check if all tasks are completed
  let totalTasks = 0;
  let doneTasks = 0;
  for (const item of Object.values(items)) {
    if (item.type !== 'task' || item.parentId || item.isArchived || item.dayKey !== dayKey) continue;
    totalTasks++;
    if (item.completed) doneTasks++;
  }
  let completedHighPriority = 0;
  let completedMediumPriority = 0;
  for (const item of Object.values(items)) {
    if (item.type !== 'task' || item.parentId || item.isArchived || item.dayKey !== dayKey || !item.completed) continue;
    if (item.isPriority) completedHighPriority++;
    else if (item.isMediumPriority) completedMediumPriority++;
  }
  const allTasksDone = totalTasks > 0 && doneTasks === totalTasks;
  const showAllDone = allTasksDone && !showCompletedTasks;

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      <div className="max-w-2xl mx-auto">
        <div className="rounded-xl border-2 border-[var(--color-border)] shadow-[0_0_20px_rgba(139,92,246,0.15)] bg-[var(--color-bg)] pl-10 pr-3 py-3 min-h-[80px]">
          <div className="mr-[34px]">
            <GreetingBanner />
          </div>
          {showReviewButton && (
            <button
              onClick={() => setView('review')}
              className="flex items-center gap-1.5 mb-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <span>Daily Review</span>
            </button>
          )}
          {showAllDone ? (
            <>
              <AllDoneToday onShowCompleted={() => setShowCompletedTasks(true)} />
              {reviewNote && (
                <div className="mt-6 mx-auto max-w-sm rounded-xl border border-amber-200 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/20 p-5">
                  <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-3 flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                    </svg>
                    Daily Review
                  </h3>
                  {reviewNote.text.split('\n').filter((line) => !line.startsWith('#')).map((line, i) => (
                    <p key={i} className="text-sm text-amber-900/80 dark:text-amber-200/80 leading-relaxed">
                      {line.split(/(\*\*.*?\*\*)/).map((part, j) =>
                        part.startsWith('**') && part.endsWith('**')
                          ? <strong key={j}>{part.slice(2, -2)}</strong>
                          : part
                      )}
                    </p>
                  ))}
                  {(completedHighPriority > 0 || completedMediumPriority > 0) && (
                    <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-amber-200 dark:border-amber-700/50">
                      {Array.from({ length: completedHighPriority }, (_, i) => (
                        <span key={`high-${i}`} className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 ring-1 ring-amber-400/30">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                          </svg>
                        </span>
                      ))}
                      {Array.from({ length: completedMediumPriority }, (_, i) => (
                        <span key={`med-${i}`} className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-400/60 ring-1 ring-blue-400/20">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                          </svg>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="flex justify-center mt-4">
                <CopyButton
                  label="Copy completed tasks"
                  getText={() => {
                    const completed = Object.values(items).filter(
                      (i) => i.type === 'task' && i.dayKey === dayKey && i.completed && !i.parentId && !i.isArchived
                    );
                    const lines = ['**Completed Today**', ''];
                    completed.forEach((i) => {
                      const prefix = i.isPriority ? '(!) ' : i.isMediumPriority ? '(*) ' : '';
                      lines.push(`- ${prefix}${i.text}`);
                    });
                    return lines.join('\n');
                  }}
                />
              </div>
            </>
          ) : (
            <>
              <div className="min-h-[8px]">
                <ItemList items={todayItems} />
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
