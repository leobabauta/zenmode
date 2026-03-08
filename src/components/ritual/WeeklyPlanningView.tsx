import { useState } from 'react';
import { nanoid } from 'nanoid';
import { usePlannerStore } from '../../store/usePlannerStore';
import { getWeekKey, toDayKey } from '../../lib/dates';
import { addDays } from 'date-fns';
import { cn } from '../../lib/utils';
import type { WeeklyPlan } from '../../types';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function WeeklyPlanningView() {
  const weekKey = getWeekKey(new Date());
  const existingPlan = usePlannerStore((s) => s.weeklyPlans[weekKey]);

  const [step, setStep] = useState(1);
  const [priorities, setPriorities] = useState<Array<{ id: string; text: string; dayKey?: string }>>(
    existingPlan?.priorities ?? []
  );
  const [newPriorityText, setNewPriorityText] = useState('');
  const [intentions, setIntentions] = useState(existingPlan?.intentions ?? '');

  const saveWeeklyPlan = usePlannerStore((s) => s.saveWeeklyPlan);
  const completeWeeklyPlanning = usePlannerStore((s) => s.completeWeeklyPlanning);
  const addItem = usePlannerStore((s) => s.addItem);

  const addPriority = () => {
    const text = newPriorityText.trim();
    if (!text) return;
    setPriorities((prev) => [...prev, { id: nanoid(), text }]);
    setNewPriorityText('');
  };

  const removePriority = (id: string) => {
    setPriorities((prev) => prev.filter((p) => p.id !== id));
  };

  const assignDay = (id: string, dayIndex: number | undefined) => {
    setPriorities((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        if (dayIndex === undefined) return { ...p, dayKey: undefined };
        const monday = new Date(weekKey + 'T00:00:00');
        const target = addDays(monday, dayIndex);
        return { ...p, dayKey: toDayKey(target) };
      })
    );
  };

  const getDayIndex = (dayKey?: string): number | undefined => {
    if (!dayKey) return undefined;
    const monday = new Date(weekKey + 'T00:00:00');
    const target = new Date(dayKey + 'T00:00:00');
    const diff = Math.round((target.getTime() - monday.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 6 ? diff : undefined;
  };

  const handleFinish = () => {
    const plan: WeeklyPlan = {
      weekKey,
      priorities,
      intentions,
      completedAt: new Date().toISOString(),
    };
    saveWeeklyPlan(plan);

    // Create tasks on assigned days
    for (const p of priorities) {
      if (p.dayKey) {
        addItem({ type: 'task', text: p.text, dayKey: p.dayKey });
      }
    }

    completeWeeklyPlanning();
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      <div className="max-w-lg mx-auto">
        <h1 className="text-5xl font-bold dark:font-extrabold text-[var(--color-text-primary)] mb-8 mt-16">
          Weekly Planning
        </h1>
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
              What are your top priorities this week?
            </h2>
            <p className="text-sm text-[var(--color-text-muted)] text-center mb-6">
              Add the key things you want to accomplish.
            </p>

            <div className="rounded-xl border border-[var(--color-border)] p-3 min-h-[80px]">
              {priorities.map((p) => (
                <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--color-surface)] transition-colors group">
                  <span className="text-sm text-[var(--color-text-primary)] flex-1">{p.text}</span>
                  <button
                    onClick={() => removePriority(p.id)}
                    className="opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-red-500 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              <div className="flex gap-2 mt-1 px-3">
                <input
                  type="text"
                  value={newPriorityText}
                  onChange={(e) => setNewPriorityText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addPriority(); }}
                  placeholder="Add a priority..."
                  autoFocus
                  className="flex-1 text-sm bg-transparent outline-none text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] py-2"
                />
                {newPriorityText.trim() && (
                  <button
                    onClick={addPriority}
                    className="text-xs text-blue-500 hover:text-blue-600 font-medium"
                  >
                    Add
                  </button>
                )}
              </div>
            </div>

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
              Assign days (optional)
            </h2>
            <p className="text-sm text-[var(--color-text-muted)] text-center mb-6">
              Assign priorities to specific days. They'll be added as tasks.
            </p>

            <div className="rounded-xl border border-[var(--color-border)] p-3 space-y-3">
              {priorities.length === 0 && (
                <p className="text-sm text-[var(--color-text-muted)] text-center py-4">No priorities added yet.</p>
              )}
              {priorities.map((p) => {
                const selectedDay = getDayIndex(p.dayKey);
                return (
                  <div key={p.id} className="px-3 py-2">
                    <p className="text-sm text-[var(--color-text-primary)] mb-2">{p.text}</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {DAY_LABELS.map((label, i) => (
                        <button
                          key={label}
                          onClick={() => assignDay(p.id, selectedDay === i ? undefined : i)}
                          className={cn(
                            'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                            selectedDay === i
                              ? 'bg-blue-500 text-white'
                              : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

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
              Set your weekly intention
            </h2>
            <p className="text-sm text-[var(--color-text-muted)] text-center mb-6">
              What practice or mindset do you want to bring this week?
            </p>
            <textarea
              value={intentions}
              onChange={(e) => setIntentions(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); setStep(4); } }}
              placeholder="e.g. Stay focused on deep work, practice patience, prioritize health..."
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
              You're all set for the week!
            </h2>
            <p className="text-sm text-[var(--color-text-muted)] text-center mb-6">
              Here's your weekly plan.
            </p>

            {/* Priorities summary */}
            {priorities.length > 0 && (
              <div className="mb-3 rounded-xl border border-blue-500/30 bg-blue-500/5 p-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-2 block">
                  Priorities
                </span>
                {priorities.map((p) => (
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

            {/* Intention summary */}
            {intentions.trim() && (
              <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex-shrink-0 block mb-1">
                  Intention
                </span>
                <span className="text-sm text-[var(--color-text-primary)]">{intentions}</span>
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
                Let's go!
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
