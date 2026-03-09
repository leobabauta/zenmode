import { useState } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';
import { getWeekKey } from '../../lib/dates';
import { addDays, format } from 'date-fns';

export function WeekReviewPage() {
  const weeklyReviews = usePlannerStore((s) => s.weeklyReviews);
  const setView = usePlannerStore((s) => s.setView);

  // Start with the most recent review or current week
  const allWeekKeys = Object.keys(weeklyReviews).sort((a, b) => b.localeCompare(a));
  const [selectedWeekKey, setSelectedWeekKey] = useState(allWeekKeys[0] ?? getWeekKey(new Date()));

  const review = weeklyReviews[selectedWeekKey];
  const currentIdx = allWeekKeys.indexOf(selectedWeekKey);

  const mondayDate = new Date(selectedWeekKey + 'T00:00:00');
  const sundayDate = addDays(mondayDate, 6);
  const weekLabel = `${format(mondayDate, 'MMM d')} - ${format(sundayDate, 'MMM d, yyyy')}`;

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8">
      <div className="max-w-lg mx-auto">
        {/* Header with navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setView('timeline')}
            className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            &larr; Back
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (currentIdx < allWeekKeys.length - 1) setSelectedWeekKey(allWeekKeys[currentIdx + 1]);
              }}
              disabled={currentIdx >= allWeekKeys.length - 1}
              className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] disabled:opacity-30 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => {
                if (currentIdx > 0) setSelectedWeekKey(allWeekKeys[currentIdx - 1]);
              }}
              disabled={currentIdx <= 0}
              className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] disabled:opacity-30 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        <h1 className="text-xl font-bold text-center text-[var(--color-text-primary)] mb-1">
          Week Review
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] text-center mb-6">{weekLabel}</p>

        {!review ? (
          <p className="text-sm text-[var(--color-text-muted)] text-center py-8">
            {allWeekKeys.length === 0 ? 'No weekly reviews yet.' : 'No review for this week.'}
          </p>
        ) : (
          <>
            {review.priorityReflections?.trim() && (
              <div className="mb-3 rounded-xl border border-blue-500/30 bg-blue-500/5 px-3 py-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-400 block mb-1">
                  Priority Reflections
                </span>
                <span className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap">{review.priorityReflections}</span>
              </div>
            )}

            {review.wins?.trim() && (
              <div className="mb-3 rounded-xl border border-green-500/30 bg-green-500/5 px-3 py-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-green-400 block mb-1">
                  Wins
                </span>
                <span className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap">{review.wins}</span>
              </div>
            )}

            {review.learned?.trim() && (
              <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 block mb-1">
                  Learned
                </span>
                <span className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap">{review.learned}</span>
              </div>
            )}

            <p className="text-xs text-[var(--color-text-muted)] text-center mt-4">
              Completed {new Date(review.completedAt).toLocaleString()}
            </p>

            {/* Edit / redo button */}
            <div className="mt-4 text-center">
              <button
                onClick={() => setView('weeklyReview')}
                className="inline-flex items-center gap-1.5 text-sm text-[var(--color-accent)] hover:underline transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M21.015 4.356v4.992" />
                </svg>
                Redo this ritual
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
