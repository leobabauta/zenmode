import { useState } from 'react';
import { usePlannerStore, selectItemsForDay } from '../../store/usePlannerStore';
import { toDayKey } from '../../lib/dates';
import { ItemList } from '../items/ItemList';
import { AddItemForm } from '../forms/AddItemForm';

export function DailyRitualView() {
  const [step, setStep] = useState(1);
  const [priorities, setPriorities] = useState(['', '', '']);
  const [practice, setPractice] = useState('');
  const addItem = usePlannerStore((s) => s.addItem);
  const completeRitual = usePlannerStore((s) => s.completeRitual);
  const items = usePlannerStore((s) => s.items);

  const dayKey = toDayKey(new Date());
  const todayItems = selectItemsForDay(items, dayKey);

  const handleFinish = () => {
    // Create priority items
    priorities.forEach((text) => {
      const trimmed = text.trim();
      if (trimmed) {
        addItem({ type: 'task', text: trimmed, dayKey, isPriority: true });
      }
    });
    // Create practice item
    const trimmedPractice = practice.trim();
    if (trimmedPractice) {
      addItem({ type: 'task', text: trimmedPractice, dayKey, isPractice: true });
    }
    completeRitual();
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
              What are your 3 priorities today?
            </h2>
            <p className="text-sm text-[var(--color-text-muted)] text-center mb-6">
              Focus on what matters most.
            </p>
            <div className="space-y-3">
              {priorities.map((val, i) => (
                <input
                  key={i}
                  type="text"
                  value={val}
                  onChange={(e) => {
                    const next = [...priorities];
                    next[i] = e.target.value;
                    setPriorities(next);
                  }}
                  placeholder={`Priority ${i + 1}`}
                  autoFocus={i === 0}
                  className="w-full px-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              ))}
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setStep(2)}
                disabled={!priorities.some((p) => p.trim())}
                className="px-5 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold text-center mb-1 text-[var(--color-text-primary)]">
              What would you like to practice today?
            </h2>
            <p className="text-sm text-[var(--color-text-muted)] text-center mb-6">
              Choose one skill or habit to focus on.
            </p>
            <input
              type="text"
              value={practice}
              onChange={(e) => setPractice(e.target.value)}
              placeholder="e.g. Deep listening, patience, staying present..."
              autoFocus
              className="w-full px-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500/40"
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
                disabled={!practice.trim()}
                className="px-5 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-xl font-bold text-center mb-1 text-[var(--color-text-primary)]">
              Organize your tasks for today
            </h2>
            <p className="text-sm text-[var(--color-text-muted)] text-center mb-6">
              Review and add any tasks you need to do today.
            </p>
            <div className="rounded-xl p-3 min-h-[80px] border border-[var(--color-border)]">
              <div className="min-h-[8px]">
                <ItemList items={todayItems} />
              </div>
              <AddItemForm dayKey={dayKey} className="mt-1" />
            </div>
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
