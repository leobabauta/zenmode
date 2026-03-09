import { useState, useEffect, useCallback } from 'react';
import { usePlannerStore, selectItemsForDay, selectInboxItems } from '../../store/usePlannerStore';
import { toDayKey } from '../../lib/dates';
import { addDays } from 'date-fns';
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
  // Determine first step based on available content
  const getFirstStep = () => {
    const inbox = selectInboxItems(usePlannerStore.getState().items);
    if (inbox.length > 0) return 1; // inbox triage
    if (hasGoogleClientId && !usePlannerStore.getState().googleCalendarDismissed) return 2; // calendar
    return 3; // organize
  };
  const [step, setStep] = useState(getFirstStep);
  const [practice, setPractice] = useState('');
  const setView = usePlannerStore((s) => s.setView);
  const addItem = usePlannerStore((s) => s.addItem);
  const updateItem = usePlannerStore((s) => s.updateItem);
  const moveItem = usePlannerStore((s) => s.moveItem);
  const sendToLater = usePlannerStore((s) => s.sendToLater);
  const completeRitual = usePlannerStore((s) => s.completeRitual);
  const items = usePlannerStore((s) => s.items);
  const googleCalendarConnected = usePlannerStore((s) => s.googleCalendarConnected);
  const googleCalendarDismissed = usePlannerStore((s) => s.googleCalendarDismissed);
  const setGoogleCalendarConnected = usePlannerStore((s) => s.setGoogleCalendarConnected);
  const setGoogleCalendarDismissed = usePlannerStore((s) => s.setGoogleCalendarDismissed);
  const [calConnecting, setCalConnecting] = useState(false);

  const dayKey = toDayKey(new Date());
  const tomorrowKey = toDayKey(addDays(new Date(), 1));
  const allTodayItems = selectItemsForDay(items, dayKey);
  const todayItems = allTodayItems.filter((i) => i.type !== 'note');
  const inboxItems = selectInboxItems(items);

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
    if (step === 2 && hasGoogleClientId && !googleCalendarDismissed && googleCalendarConnected && calEvents.length === 0 && !calLoading && !calError) {
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
    setStep(3);
  };

  const moveInboxToToday = (id: string) => {
    const maxOrder = todayItems.length > 0 ? Math.max(...todayItems.map((i) => i.order)) : -1;
    moveItem(id, dayKey, maxOrder + 1);
  };

  const moveInboxToTomorrow = (id: string) => {
    const tomorrowItems = selectItemsForDay(items, tomorrowKey);
    const maxOrder = tomorrowItems.length > 0 ? Math.max(...tomorrowItems.map((i) => i.order)) : -1;
    moveItem(id, tomorrowKey, maxOrder + 1);
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
    setStep(7);
  };

  // Whether the calendar step is active (has client ID and not permanently dismissed)
  const showCalendarStep = hasGoogleClientId && !googleCalendarDismissed;
  // Whether inbox triage step was shown (track initial state so circles remain even after moving items)
  const [hadInboxItems] = useState(() => inboxItems.length > 0);
  const showInboxStep = hadInboxItems;

  // Calculate display step and total, skipping hidden steps
  // Internal steps: 1=inbox, 2=calendar, 3=organize, 4=priorities, 5=medium, 6=practice, 7=summary
  const getDisplayStep = () => {
    let display = step;
    if (!showInboxStep && step >= 2) display -= 1;
    if (!showCalendarStep && step >= 3) display -= 1;
    return Math.max(1, display);
  };
  const displayStep = getDisplayStep();
  const displayTotal = 5 + (showInboxStep ? 1 : 0) + (showCalendarStep ? 1 : 0);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      <div className="max-w-lg mx-auto">
        <div className="relative mt-16 mb-8">
          <button
            onClick={() => setView('today')}
            className="absolute -left-40 top-2 w-8 h-8 flex items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors"
            title="Exit ritual"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h1 className="text-5xl font-bold dark:font-extrabold text-[var(--color-text-primary)]">
            Daily Planning Ritual
          </h1>
        </div>
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

        {/* Step 1: Triage Inbox */}
        {step === 1 && showInboxStep && (
          <div>
            <h2 className="text-xl font-bold text-center mb-1 text-[var(--color-text-primary)]">
              Triage your inbox
            </h2>
            <p className="text-sm text-[var(--color-text-muted)] text-center mb-6">
              Move tasks to Today, Tomorrow, or Later — or leave them in the inbox.
            </p>

            <div className="flex gap-6">
              {/* Inbox items on the left */}
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2 px-1">
                  Inbox ({inboxItems.length})
                </h3>
                <div className="rounded-xl border border-[var(--color-border)] p-2 min-h-[120px] max-h-[50vh] overflow-y-auto">
                  {inboxItems.length === 0 ? (
                    <p className="text-sm text-[var(--color-text-muted)] text-center py-6">
                      Inbox is empty!
                    </p>
                  ) : (
                    inboxItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-[var(--color-surface)] transition-colors">
                        <span className="flex-1 min-w-0 text-sm text-[var(--color-text-primary)] truncate">
                          {item.text}
                        </span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => moveInboxToToday(item.id)}
                            className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
                            title="Move to Today"
                          >
                            Today
                          </button>
                          <button
                            onClick={() => moveInboxToTomorrow(item.id)}
                            className="px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] transition-colors"
                            title="Move to Tomorrow"
                          >
                            Tmrw
                          </button>
                          <button
                            onClick={() => sendToLater(item.id)}
                            className="px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)] transition-colors"
                            title="Move to Later"
                          >
                            Later
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Drop targets on the right */}
              <div className="flex flex-col gap-3 w-28 flex-shrink-0 pt-6">
                <div className="flex flex-col items-center justify-center w-28 h-28 rounded-full border-2 border-dashed border-blue-400/40 bg-blue-500/5 text-center">
                  <svg className="w-5 h-5 text-blue-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                  </svg>
                  <span className="text-xs font-medium text-blue-400">Today</span>
                </div>
                <div className="flex flex-col items-center justify-center w-28 h-28 rounded-full border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface)] text-center">
                  <svg className="w-5 h-5 text-[var(--color-text-muted)] mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                  <span className="text-xs font-medium text-[var(--color-text-muted)]">Tomorrow</span>
                </div>
                <div className="flex flex-col items-center justify-center w-28 h-28 rounded-full border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface)] text-center">
                  <svg className="w-5 h-5 text-[var(--color-text-muted)] mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                  </svg>
                  <span className="text-xs font-medium text-[var(--color-text-muted)]">Later</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setStep(showCalendarStep ? 2 : 3)}
                className="px-5 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Google Calendar import */}
        {step === 2 && showCalendarStep && (
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
                    onClick={() => setStep(3)}
                    className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                  >
                    Skip
                  </button>
                  <button
                    onClick={() => { setGoogleCalendarDismissed(true); setStep(3); }}
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
              {showInboxStep && (
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors"
                >
                  Back
                </button>
              )}
              {googleCalendarConnected && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setStep(3)}
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

        {/* Step 3: Organize tasks */}
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
            <div className={cn('flex mt-6', (showCalendarStep || showInboxStep) ? 'justify-between' : 'justify-end')}>
              {(showCalendarStep || showInboxStep) && (
                <button
                  onClick={() => setStep(showCalendarStep ? 2 : 1)}
                  className="px-4 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors"
                >
                  Back
                </button>
              )}
              <button
                onClick={() => setStep(4)}
                className="px-5 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Top priorities */}
        {step === 4 && (
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
            <div className="flex justify-between mt-6">
              <button
                onClick={() => setStep(3)}
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

        {/* Step 5: Medium priorities */}
        {step === 5 && (
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
                onClick={() => setStep(4)}
                className="px-4 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep(6)}
                className="px-5 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 6: Practice */}
        {step === 6 && (
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
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSavePractice(); } }}
              placeholder="e.g. Deep listening, patience, staying present..."
              autoFocus
              className="w-full px-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
            <div className="flex justify-between mt-6">
              <button
                onClick={() => setStep(5)}
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

        {/* Step 7: Summary */}
        {step === 7 && (() => {
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
                  onClick={() => setStep(6)}
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
