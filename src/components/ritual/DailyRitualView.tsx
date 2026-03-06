import { useState, useEffect, useCallback } from 'react';
import { usePlannerStore, selectItemsForDay } from '../../store/usePlannerStore';
import { toDayKey } from '../../lib/dates';
import { fetchTodayEvents, formatEventAsTask, requestCalendarAccess } from '../../lib/googleCalendar';
import { ItemList } from '../items/ItemList';
import { AddItemForm } from '../forms/AddItemForm';
import { Checkbox } from '../ui/Checkbox';
import { HashtagText } from '../ui/HashtagText';
import { cn } from '../../lib/utils';
import type { PlannerItem } from '../../types';

const hasGoogleClientId = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

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

interface CalendarEvent {
  id: string;
  taskText: string;
  selected: boolean;
}

export function DailyRitualView() {
  const [step, setStep] = useState(1);
  const [practice, setPractice] = useState('');
  const addItem = usePlannerStore((s) => s.addItem);
  const updateItem = usePlannerStore((s) => s.updateItem);
  const completeRitual = usePlannerStore((s) => s.completeRitual);
  const items = usePlannerStore((s) => s.items);
  const googleCalendarConnected = usePlannerStore((s) => s.googleCalendarConnected);
  const googleCalendarDismissed = usePlannerStore((s) => s.googleCalendarDismissed);
  const setGoogleCalendarConnected = usePlannerStore((s) => s.setGoogleCalendarConnected);
  const setGoogleCalendarDismissed = usePlannerStore((s) => s.setGoogleCalendarDismissed);
  const [calConnecting, setCalConnecting] = useState(false);

  const dayKey = toDayKey(new Date());
  const allTodayItems = selectItemsForDay(items, dayKey);
  const todayItems = allTodayItems.filter((i) => i.type !== 'note');

  const priorityCount = todayItems.filter((i) => i.isPriority).length;
  const mediumCount = todayItems.filter((i) => i.isMediumPriority).length;

  // Google Calendar import state
  const [calEvents, setCalEvents] = useState<CalendarEvent[]>([]);
  const [calLoading, setCalLoading] = useState(false);
  const [calError, setCalError] = useState<string | null>(null);

  const loadCalendarEvents = useCallback(async () => {
    setCalLoading(true);
    setCalError(null);
    try {
      const events = await fetchTodayEvents();
      setCalEvents(
        events.map((e) => ({
          id: e.id,
          taskText: formatEventAsTask(e),
          selected: true,
        }))
      );
    } catch (err) {
      setCalError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setCalLoading(false);
    }
  }, []);

  useEffect(() => {
    if (step === 3 && hasGoogleClientId && !googleCalendarDismissed && googleCalendarConnected && calEvents.length === 0 && !calLoading && !calError) {
      loadCalendarEvents();
    }
  }, [step, calEvents.length, calLoading, calError, loadCalendarEvents, googleCalendarConnected, googleCalendarDismissed]);

  const handleConnectCalendar = async () => {
    setCalConnecting(true);
    setCalError(null);
    try {
      await requestCalendarAccess();
      setGoogleCalendarConnected(true);
      // Events will auto-load via the useEffect
    } catch (err) {
      setCalError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setCalConnecting(false);
    }
  };

  const toggleCalEvent = (id: string) => {
    setCalEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, selected: !e.selected } : e))
    );
  };

  const importCalEvents = () => {
    for (const event of calEvents) {
      if (event.selected) {
        addItem({ type: 'task', text: event.taskText, dayKey });
      }
    }
    setStep(4);
  };

  const togglePriority = (item: PlannerItem) => {
    updateItem(item.id, { isPriority: item.isPriority ? undefined : true });
  };

  const toggleMediumPriority = (item: PlannerItem) => {
    updateItem(item.id, { isMediumPriority: item.isMediumPriority ? undefined : true });
  };

  const handleSavePractice = () => {
    const trimmedPractice = practice.trim();
    if (trimmedPractice) {
      addItem({ type: 'task', text: trimmedPractice, dayKey, isPractice: true });
      setPractice('');
    }
    setStep(6);
  };

  // Whether the calendar step is active (has client ID and not permanently dismissed)
  const showCalendarStep = hasGoogleClientId && !googleCalendarDismissed;

  // Map internal step to display step (skip calendar step when not shown)
  const displayStep = !showCalendarStep && step >= 3 ? step - 1 : step;
  const displayTotal = showCalendarStep ? 6 : 5;

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8">
      <div className="max-w-lg mx-auto">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {Array.from({ length: displayTotal }, (_, i) => i + 1).map((s) => (
            <div
              key={s}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                s === displayStep
                  ? 'bg-blue-500'
                  : s < displayStep
                    ? 'bg-blue-300'
                    : 'bg-[var(--color-border)]'
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold text-center mb-1 text-[var(--color-text-primary)]">
              Mark up to 3 top priorities
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
              Mark up to 3 medium priorities
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
                onClick={() => setStep(showCalendarStep ? 3 : 4)}
                className="px-5 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 3 && showCalendarStep && (
          <div>
            <h2 className="text-xl font-bold text-center mb-1 text-[var(--color-text-primary)]">
              Import from Google Calendar?
            </h2>
            <p className="text-sm text-[var(--color-text-muted)] text-center mb-6">
              Add today's calendar events as tasks.
            </p>

            {!googleCalendarConnected && (
              <div className="flex flex-col items-center py-8 gap-4">
                {calError && (
                  <p className="text-sm text-red-500">{calError}</p>
                )}
                <button
                  onClick={handleConnectCalendar}
                  disabled={calConnecting}
                  className="px-5 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-60"
                >
                  {calConnecting ? 'Connecting...' : 'Connect to Google Calendar'}
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(4)}
                    className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                  >
                    Skip
                  </button>
                  <button
                    onClick={() => { setGoogleCalendarDismissed(true); setStep(4); }}
                    className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
                  >
                    Don't ask again
                  </button>
                </div>
              </div>
            )}

            {googleCalendarConnected && calLoading && (
              <div className="flex items-center justify-center py-8">
                <span className="text-sm text-[var(--color-text-muted)]">Loading events...</span>
              </div>
            )}

            {googleCalendarConnected && calError && (
              <div className="py-8">
                <p className="text-sm text-red-500 mb-3">{calError}</p>
                <button
                  onClick={loadCalendarEvents}
                  className="text-sm text-[var(--color-accent)] hover:underline"
                >
                  Try again
                </button>
              </div>
            )}

            {googleCalendarConnected && !calLoading && !calError && calEvents.length === 0 && (
              <div className="flex items-center justify-center py-8">
                <span className="text-sm text-[var(--color-text-muted)]">
                  No events on your calendar today
                </span>
              </div>
            )}

            {googleCalendarConnected && !calLoading && !calError && calEvents.length > 0 && (
              <div className="rounded-xl border border-[var(--color-border)] p-2 max-h-[50vh] overflow-y-auto space-y-1">
                {calEvents.map((event) => (
                  <label
                    key={event.id}
                    className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-[var(--color-surface)] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={event.selected}
                      onChange={() => toggleCalEvent(event.id)}
                      className="rounded"
                    />
                    <span className="text-sm text-[var(--color-text-primary)]">
                      {event.taskText}
                    </span>
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
              {googleCalendarConnected && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setStep(4)}
                    className="px-4 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors"
                  >
                    Skip
                  </button>
                  <button
                    onClick={importCalEvents}
                    disabled={calEvents.filter((e) => e.selected).length === 0}
                    className="px-5 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Import{calEvents.filter((e) => e.selected).length > 0 ? ` (${calEvents.filter((e) => e.selected).length})` : ''}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 4 && (
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
                onClick={() => setStep(showCalendarStep ? 3 : 2)}
                className="px-4 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep(5)}
                className="px-5 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
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
                onClick={() => setStep(4)}
                className="px-4 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSavePractice}
                className="px-5 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 6 && (() => {
          const practiceItems = allTodayItems.filter((i) => i.isPractice);
          const priorityItems = todayItems.filter((i) => i.isPriority);
          const mediumPriorityItems = todayItems.filter((i) => i.isMediumPriority && !i.isPriority);
          const otherItems = todayItems.filter((i) => !i.isPriority && !i.isMediumPriority && !i.isPractice);
          return (
            <div>
              <h2 className="text-xl font-bold text-center mb-1 text-[var(--color-text-primary)]">
                You're all set!
              </h2>
              <p className="text-sm text-[var(--color-text-muted)] text-center mb-6">
                Here's your plan for today.
              </p>

              {/* Practice */}
              {practiceItems.length > 0 && (
                <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex-shrink-0">
                    Practice
                  </span>
                  <span className="text-sm text-[var(--color-text-primary)]">
                    {practiceItems.map((i) => i.text).join(', ')}
                  </span>
                </div>
              )}

              {/* Priorities */}
              {priorityItems.length > 0 && (
                <div className="mb-3 rounded-xl border border-blue-500/30 bg-blue-500/5 p-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-2 block">
                    Priorities
                  </span>
                  {priorityItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 px-3 py-1.5">
                      <Checkbox checked={item.completed} onChange={(checked) => updateItem(item.id, { completed: checked })} />
                      <span className={cn('text-sm', item.completed && 'line-through text-[var(--color-text-muted)]')}>{item.text}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Medium priorities */}
              {mediumPriorityItems.length > 0 && (
                <div className="mb-3 rounded-xl border border-slate-400/30 bg-slate-400/5 p-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 block">
                    Medium Priorities
                  </span>
                  {mediumPriorityItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 px-3 py-1.5">
                      <Checkbox checked={item.completed} onChange={(checked) => updateItem(item.id, { completed: checked })} />
                      <span className={cn('text-sm', item.completed && 'line-through text-[var(--color-text-muted)]')}>{item.text}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Other tasks */}
              {otherItems.length > 0 && (
                <div className="mb-3 rounded-xl border border-[var(--color-border)] p-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2 block">
                    Other Tasks
                  </span>
                  {otherItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 px-3 py-1.5">
                      <Checkbox checked={item.completed} onChange={(checked) => updateItem(item.id, { completed: checked })} />
                      <span className={cn('text-sm', item.completed && 'line-through text-[var(--color-text-muted)]')}>{item.text}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setStep(5)}
                  className="px-4 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={completeRitual}
                  className="px-5 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
                >
                  Let's go!
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
