import { useState } from 'react';
import { usePlannerStore, selectItemsForDay } from '../../store/usePlannerStore';
import { toDayKey } from '../../lib/dates';
import { ItemList } from '../items/ItemList';
import { AddItemForm } from '../forms/AddItemForm';
import { Checkbox } from '../ui/Checkbox';
import { HashtagText } from '../ui/HashtagText';
import { cn } from '../../lib/utils';
import type { PlannerItem } from '../../types';

function StarIcon({ filled, color }: { filled: boolean; color: 'yellow' | 'blue' }) {
  const colors = color === 'yellow'
    ? { bg: 'bg-amber-400', ring: 'ring-amber-400/30', text: 'text-white' }
    : { bg: 'bg-slate-400', ring: 'ring-slate-400/30', text: 'text-white' };

  if (!filled) {
    return (
      <svg className="w-5 h-5 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
      </svg>
    );
  }

  return (
    <span className={cn('inline-flex items-center justify-center w-5 h-5 rounded-full', colors.bg, `ring-2 ${colors.ring}`)}>
      <svg className={cn('w-3 h-3', colors.text)} fill="currentColor" viewBox="0 0 24 24">
        <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
      </svg>
    </span>
  );
}

interface RitualTaskRowProps {
  item: PlannerItem;
  starred: boolean;
  locked?: boolean;
  lockedColor?: 'yellow' | 'blue';
  color: 'yellow' | 'blue';
  onToggle: () => void;
  disabled?: boolean;
}

function RitualTaskRow({ item, starred, locked, lockedColor, color, onToggle, disabled }: RitualTaskRowProps) {
  const updateItem = usePlannerStore((s) => s.updateItem);
  const setHashtagView = usePlannerStore((s) => s.setHashtagView);

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--color-surface)] transition-colors">
      {locked ? (
        <span className="flex-shrink-0">
          <StarIcon filled color={lockedColor!} />
        </span>
      ) : (
        <button
          type="button"
          onClick={onToggle}
          disabled={disabled && !starred}
          className={cn(
            'flex-shrink-0 transition-opacity',
            disabled && !starred && 'opacity-30 cursor-not-allowed'
          )}
        >
          <StarIcon filled={starred} color={color} />
        </button>
      )}

      <div className="mt-0.5">
        <Checkbox
          checked={item.completed}
          onChange={(checked) => updateItem(item.id, { completed: checked })}
        />
      </div>

      <div className="flex-1 min-w-0">
        <HashtagText
          text={item.text}
          onHashtagClick={setHashtagView}
          className={cn(
            'text-sm break-words',
            item.completed ? 'line-through text-[var(--color-text-muted)]' : 'text-[var(--color-text-primary)]'
          )}
        />
      </div>
    </div>
  );
}

export function DailyRitualView() {
  const [step, setStep] = useState(1);
  const [practice, setPractice] = useState('');
  const addItem = usePlannerStore((s) => s.addItem);
  const updateItem = usePlannerStore((s) => s.updateItem);
  const completeRitual = usePlannerStore((s) => s.completeRitual);
  const items = usePlannerStore((s) => s.items);

  const dayKey = toDayKey(new Date());
  const allTodayItems = selectItemsForDay(items, dayKey);
  const todayItems = allTodayItems.filter((i) => i.type !== 'note');

  const priorityCount = todayItems.filter((i) => i.isPriority).length;
  const mediumCount = todayItems.filter((i) => i.isMediumPriority).length;

  const togglePriority = (item: PlannerItem) => {
    updateItem(item.id, { isPriority: item.isPriority ? undefined : true });
  };

  const toggleMediumPriority = (item: PlannerItem) => {
    updateItem(item.id, { isMediumPriority: item.isMediumPriority ? undefined : true });
  };

  const handleFinish = () => {
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
              Mark your top 3 priorities
            </h2>
            <p className="text-sm text-[var(--color-text-muted)] text-center mb-2">
              Star the tasks that matter most today.
            </p>
            <p className="text-xs text-center mb-6">
              <span className={cn(
                'font-semibold',
                priorityCount === 3 ? 'text-amber-500' : 'text-[var(--color-text-muted)]'
              )}>
                {priorityCount} of 3 selected
              </span>
            </p>
            <div className="rounded-xl border border-[var(--color-border)] p-2 min-h-[80px]">
              {todayItems.map((item) => (
                <RitualTaskRow
                  key={item.id}
                  item={item}
                  starred={!!item.isPriority}
                  color="yellow"
                  onToggle={() => togglePriority(item)}
                  disabled={priorityCount >= 3}
                />
              ))}
              <AddItemForm dayKey={dayKey} className="mt-1 px-3" />
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setStep(2)}
                disabled={priorityCount < 1}
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
              Mark 3 medium priorities
            </h2>
            <p className="text-sm text-[var(--color-text-muted)] text-center mb-2">
              Optional — star tasks that are important but not critical.
            </p>
            <p className="text-xs text-center mb-6">
              <span className={cn(
                'font-semibold',
                mediumCount === 3 ? 'text-slate-500' : 'text-[var(--color-text-muted)]'
              )}>
                {mediumCount} of 3 selected
              </span>
            </p>
            <div className="rounded-xl border border-[var(--color-border)] p-2 min-h-[80px]">
              {todayItems.map((item) => (
                <RitualTaskRow
                  key={item.id}
                  item={item}
                  starred={!!item.isMediumPriority}
                  locked={!!item.isPriority}
                  lockedColor="yellow"
                  color="blue"
                  onToggle={() => toggleMediumPriority(item)}
                  disabled={mediumCount >= 3}
                />
              ))}
              <AddItemForm dayKey={dayKey} className="mt-1 px-3" />
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
              Organize your tasks for today
            </h2>
            <p className="text-sm text-[var(--color-text-muted)] text-center mb-6">
              Drag to reorder, add any tasks you missed.
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
