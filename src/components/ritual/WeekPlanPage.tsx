import { useState } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';
import { getWeekKey } from '../../lib/dates';
import { addDays, format } from 'date-fns';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function WeekPlanPage() {
  const weeklyPlans = usePlannerStore((s) => s.weeklyPlans);
  const setView = usePlannerStore((s) => s.setView);
  const [selectedWeekKey, setSelectedWeekKey] = useState(getWeekKey(new Date()));

  const plan = weeklyPlans[selectedWeekKey];

  // Get sorted week keys for navigation
  const allWeekKeys = Object.keys(weeklyPlans).sort((a, b) => b.localeCompare(a));
  const currentIdx = allWeekKeys.indexOf(selectedWeekKey);

  const getDayIndex = (dayKey?: string): number | undefined => {
    if (!dayKey) return undefined;
    const monday = new Date(selectedWeekKey + 'T00:00:00');
    const target = new Date(dayKey + 'T00:00:00');
    const diff = Math.round((target.getTime() - monday.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 6 ? diff : undefined;
  };

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
          Week's Plan
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] text-center mb-6">{weekLabel}</p>

        {!plan ? (
          <p className="text-sm text-[var(--color-text-muted)] text-center py-8">
            No plan for this week yet.
          </p>
        ) : (
          <>
            {/* Priorities */}
            {plan.priorities.length > 0 && (
              <div className="mb-4 rounded-xl border border-blue-500/30 bg-blue-500/5 p-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-2 block">
                  Priorities
                </span>
                {plan.priorities.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 px-3 py-1.5">
                    <span className="text-sm text-[var(--color-text-primary)] flex-1">{p.text}</span>
                    {p.dayKey && (
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {DAY_LABELS[getDayIndex(p.dayKey) ?? 0]}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Intention */}
            {plan.intentions?.trim() && (
              <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 block mb-1">
                  Intention
                </span>
                <span className="text-sm text-[var(--color-text-primary)]">{plan.intentions}</span>
              </div>
            )}

            <p className="text-xs text-[var(--color-text-muted)] text-center mt-4">
              Completed {new Date(plan.completedAt).toLocaleString()}
            </p>
          </>
        )}

        {/* Weekly Review link */}
        <div className="mt-8 text-center">
          <button
            onClick={() => setView('weekReviewPage')}
            className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>Weekly Review</span>
          </button>
        </div>
      </div>
    </div>
  );
}
