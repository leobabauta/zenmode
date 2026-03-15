import { useState, useMemo, useEffect } from 'react';
import { usePlannerStore, selectItemsForDay, selectPendingRemindersForDay } from '../../store/usePlannerStore';
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
  const pendingReminders = selectPendingRemindersForDay(items, dayKey);
  const [showReminders, setShowReminders] = useState(false);
  const deleteItem = usePlannerStore((s) => s.deleteItem);
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
          {pendingReminders.length > 0 && (
            <div className="mb-2">
              <button
                onClick={() => setShowReminders(!showReminders)}
                className="flex items-center gap-1.5 text-xs text-[var(--color-accent)] hover:opacity-80 transition-opacity"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
                <span className="font-medium">{pendingReminders.length} upcoming reminder{pendingReminders.length > 1 ? 's' : ''}</span>
              </button>
              {showReminders && (
                <div className="mt-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5">
                  {pendingReminders.map((item) => {
                    const time = new Date(item.reminderAt!).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                    return (
                      <div key={item.id} className="flex items-center gap-2 py-1 text-sm group">
                        <span className="text-[var(--color-accent)] text-xs font-medium w-16 flex-shrink-0">{time}</span>
                        <span className="text-[var(--color-text-primary)] truncate flex-1">{item.text}</span>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-[var(--color-text-muted)] hover:text-red-500 transition-all"
                          title="Delete reminder"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
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
