import { useState } from 'react';
import { usePlannerStore, selectItemsForDay } from '../../store/usePlannerStore';
import { toDayKey } from '../../lib/dates';

export function DailyReviewView() {
  const [step, setStep] = useState(1);
  const [reflection, setReflection] = useState('');
  const [celebrations, setCelebrations] = useState('');
  const [blockers, setBlockers] = useState('');

  const items = usePlannerStore((s) => s.items);
  const addItem = usePlannerStore((s) => s.addItem);
  const moveItem = usePlannerStore((s) => s.moveItem);
  const completeReviewRitual = usePlannerStore((s) => s.completeReviewRitual);

  const todayKey = toDayKey(new Date());
  const todayItems = selectItemsForDay(items, todayKey);
  const incompleteTasks = todayItems.filter((i) => i.type === 'task' && !i.completed);

  const [pushIds, setPushIds] = useState<Set<string>>(() => new Set(incompleteTasks.map((i) => i.id)));

  const togglePush = (id: string) => {
    setPushIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleFinish = () => {
    // Compile review note — each section on its own line, hashtag at end
    const lines: string[] = [];
    if (reflection.trim()) lines.push(`**Reflection:** ${reflection.trim()}`);
    if (celebrations.trim()) lines.push(`**Celebrations:** ${celebrations.trim()}`);
    if (blockers.trim()) lines.push(`**Blockers:** ${blockers.trim()}`);
    lines.push('#dailyreview');

    addItem({ type: 'note', text: lines.join('\n'), dayKey: todayKey });

    // Push selected incomplete tasks to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowKey = toDayKey(tomorrow);
    for (const id of pushIds) {
      if (items[id]) {
        moveItem(id, tomorrowKey, 0);
      }
    }

    completeReviewRitual();
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8">
      <div className="max-w-lg mx-auto">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
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
              How did today go?
            </h2>
            <p className="text-sm text-[var(--color-text-muted)] text-center mb-6">
              Take a moment to reflect on your day.
            </p>
            <textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="What went well? What could have gone better?"
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
              Celebrate & identify blockers
            </h2>
            <p className="text-sm text-[var(--color-text-muted)] text-center mb-6">
              Acknowledge your wins and surface anything that held you back.
            </p>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
              What would you like to celebrate?
            </label>
            <textarea
              value={celebrations}
              onChange={(e) => setCelebrations(e.target.value)}
              placeholder="Small wins, progress, completed tasks..."
              autoFocus
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none mb-4"
            />
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
              Any blockers you noticed?
            </label>
            <textarea
              value={blockers}
              onChange={(e) => setBlockers(e.target.value)}
              placeholder="Distractions, missing info, energy levels..."
              rows={3}
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
              Push incomplete tasks to tomorrow
            </h2>
            <p className="text-sm text-[var(--color-text-muted)] text-center mb-6">
              {incompleteTasks.length === 0
                ? 'All tasks completed today! Nothing to push.'
                : 'Select which tasks to move to tomorrow.'}
            </p>
            {incompleteTasks.length > 0 && (
              <div className="rounded-xl border border-[var(--color-border)] p-2 mb-4">
                {incompleteTasks.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--color-surface)] transition-colors cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={pushIds.has(item.id)}
                      onChange={() => togglePush(item.id)}
                      className="w-4 h-4 rounded border-[var(--color-border)] text-blue-500 focus:ring-blue-500/40"
                    />
                    <span className="text-sm text-[var(--color-text-primary)]">{item.text}</span>
                  </label>
                ))}
              </div>
            )}
            <div className="flex justify-between mt-6">
              <button
                onClick={() => setStep(2)}
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
