import { useState } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';
import { getWeekKey, toDayKey } from '../../lib/dates';
import type { WeeklyReview } from '../../types';

export function WeeklyReviewView() {
  const weekKey = getWeekKey(new Date());
  const weeklyPlan = usePlannerStore((s) => s.weeklyPlans[weekKey]);
  const setView = usePlannerStore((s) => s.setView);
  const saveWeeklyReview = usePlannerStore((s) => s.saveWeeklyReview);
  const completeWeeklyReview = usePlannerStore((s) => s.completeWeeklyReview);
  const addItem = usePlannerStore((s) => s.addItem);

  const [step, setStep] = useState(1);
  const [priorityReflections, setPriorityReflections] = useState('');
  const [wins, setWins] = useState('');
  const [learned, setLearned] = useState('');

  const handleFinish = () => {
    const review: WeeklyReview = {
      weekKey,
      priorityReflections,
      wins,
      learned,
      completedAt: new Date().toISOString(),
    };
    saveWeeklyReview(review);

    // Create a #weeklyreview note
    const lines: string[] = [];
    if (priorityReflections.trim()) lines.push(`**Priority reflections:** ${priorityReflections.trim()}`);
    if (wins.trim()) lines.push(`**Wins:** ${wins.trim()}`);
    if (learned.trim()) lines.push(`**Learned:** ${learned.trim()}`);
    lines.push('#weeklyreview');

    addItem({ type: 'note', text: lines.join('\n'), dayKey: toDayKey(new Date()) });

    completeWeeklyReview();
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      <div className="max-w-lg mx-auto">
        <div className="relative mt-16 mb-8">
          <button
            onClick={() => setView('today')}
            className="absolute -left-20 top-2 w-8 h-8 flex items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors"
            title="Exit ritual"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h1 className="text-5xl font-bold dark:font-extrabold text-[var(--color-text-primary)]">
            Weekly Review
          </h1>
        </div>
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                s === step
                  ? 'bg-blue-500'
                  : s < step
                    ? 'bg-blue-300'
                    : 'bg-[var(--color-border)]'
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold text-center mb-1 text-[var(--color-text-primary)]">
              How did your priorities go?
            </h2>
            <p className="text-sm text-[var(--color-text-muted)] text-center mb-6">
              Reflect on your weekly priorities.
            </p>

            {/* Show weekly plan priorities if they exist */}
            {weeklyPlan && weeklyPlan.priorities.length > 0 && (
              <div className="mb-4 rounded-xl border border-blue-500/30 bg-blue-500/5 p-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-2 block">
                  This week's priorities
                </span>
                {weeklyPlan.priorities.map((p) => (
                  <div key={p.id} className="px-3 py-1.5">
                    <span className="text-sm text-[var(--color-text-primary)]">{p.text}</span>
                  </div>
                ))}
              </div>
            )}

            <textarea
              value={priorityReflections}
              onChange={(e) => setPriorityReflections(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); setStep(2); } }}
              placeholder="How did you do on your priorities? What got done, what didn't?"
              autoFocus
              rows={4}
              className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none"
            />
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setStep(2)}
                className="px-5 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold text-center mb-1 text-[var(--color-text-primary)]">
              What are your wins this week?
            </h2>
            <p className="text-sm text-[var(--color-text-muted)] text-center mb-6">
              Celebrate what went well, big or small.
            </p>
            <textarea
              value={wins}
              onChange={(e) => setWins(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); setStep(3); } }}
              placeholder="Achievements, breakthroughs, things you're proud of..."
              autoFocus
              rows={4}
              className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none"
            />
            <div className="flex justify-between mt-6">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="px-5 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-xl font-bold text-center mb-1 text-[var(--color-text-primary)]">
              What did you learn?
            </h2>
            <p className="text-sm text-[var(--color-text-muted)] text-center mb-6">
              Lessons, insights, or things you'd do differently.
            </p>
            <textarea
              value={learned}
              onChange={(e) => setLearned(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); setStep(4); } }}
              placeholder="Key takeaways, surprises, adjustments for next week..."
              autoFocus
              rows={4}
              className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none"
            />
            <div className="flex justify-between mt-6">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep(4)}
                className="px-5 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="text-xl font-bold text-center mb-1 text-[var(--color-text-primary)]">
              Great week in review!
            </h2>
            <p className="text-sm text-[var(--color-text-muted)] text-center mb-6">
              Here's your weekly review summary.
            </p>

            {priorityReflections.trim() && (
              <div className="mb-3 rounded-xl border border-blue-500/30 bg-blue-500/5 px-3 py-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-400 block mb-1">
                  Priority Reflections
                </span>
                <span className="text-sm text-[var(--color-text-primary)]">{priorityReflections}</span>
              </div>
            )}

            {wins.trim() && (
              <div className="mb-3 rounded-xl border border-green-500/30 bg-green-500/5 px-3 py-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-green-400 block mb-1">
                  Wins
                </span>
                <span className="text-sm text-[var(--color-text-primary)]">{wins}</span>
              </div>
            )}

            {learned.trim() && (
              <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 block mb-1">
                  Learned
                </span>
                <span className="text-sm text-[var(--color-text-primary)]">{learned}</span>
              </div>
            )}

            <div className="flex justify-between mt-6">
              <button
                onClick={() => setStep(3)}
                className="px-4 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleFinish}
                className="px-5 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                Finish
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
