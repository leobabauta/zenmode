import { useState, useCallback } from 'react';
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
  const [step, setStep] = useState(1);
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

  // Don't auto-fetch calendar events — wait for explicit user action to avoid surprise popups

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

  const importCalEvent = (eventId: string) => {
    const event = calEvents.find((e) => e.id === eventId);
    if (event) {
      addItem({ type: 'task', text: event.taskText, dayKey });
      setCalEvents((prev) => prev.filter((e) => e.id !== eventId));
    }
  };

  const importAllCalEvents = () => {
    for (const event of calEvents) {
      addItem({ type: 'task', text: event.taskText, dayKey });
    }
    setCalEvents([]);
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
    setStep(6);
  };

  // Steps: 1=Get your day right, 2=Top priorities, 3=Medium priorities, 4=Organize, 5=Practice, 6=Summary
  const displayTotal = 6;

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      <div className={cn('mx-auto', step === 1 ? 'max-w-3xl' : 'max-w-lg')}>
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
        {/* Intro paragraph — only on step 1 */}
        {step === 1 && (
          <p className="text-sm text-[var(--color-text-secondary)] text-center mb-6 max-w-md mx-auto leading-relaxed">
            A few minutes of intentional planning each morning transforms your entire day. This ritual helps you clear your inbox, set priorities, and choose what to focus on — so you can work with calm clarity instead of reactive urgency.
          </p>
        )}

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {Array.from({ length: displayTotal }, (_, i) => i + 1).map((s) => (
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

        {/* Step 1: Get your day right — inbox + calendar + today + move targets */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold text-center mb-1 text-[var(--color-text-primary)]">
              Let's get your day right
            </h2>
            <p className="text-sm text-[var(--color-text-muted)] text-center mb-6">
              Add or remove tasks to get your Today list as you'd like it.
            </p>

            <div className="flex gap-4 items-start">
              {/* LEFT: Inbox + Calendar */}
              <div className="w-[240px] flex-shrink-0 flex flex-col gap-4">
                {/* Inbox */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2 px-1">
                    Inbox {inboxItems.length > 0 && `(${inboxItems.length})`}
                  </h3>
                  <div className="rounded-xl border border-[var(--color-border)] p-2 min-h-[80px] max-h-[30vh] overflow-y-auto">
                    {inboxItems.length === 0 ? (
                      <p className="text-xs text-[var(--color-text-muted)] text-center py-4">
                        Inbox is empty
                      </p>
                    ) : (
                      inboxItems.map((item) => (
                        <div key={item.id} className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-[var(--color-surface)] transition-colors group">
                          <span className="flex-1 min-w-0 text-xs text-[var(--color-text-primary)] truncate">
                            {item.text}
                          </span>
                          <button
                            onClick={() => moveInboxToToday(item.id)}
                            className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors opacity-0 group-hover:opacity-100"
                            title="Add to Today"
                          >
                            +Today
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Calendar events */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2 px-1">
                    Calendar
                  </h3>
                  <div className="rounded-xl border border-[var(--color-border)] p-2 min-h-[80px] max-h-[30vh] overflow-y-auto">
                    {calLoading && (
                      <p className="text-xs text-[var(--color-text-muted)] text-center py-4">
                        Loading events...
                      </p>
                    )}
                    {calError && (
                      <div className="text-center py-3">
                        <p className="text-xs text-red-500 mb-1">{calError}</p>
                        <button onClick={loadCalendarEvents} className="text-xs text-[var(--color-accent)] hover:underline">
                          Try again
                        </button>
                      </div>
                    )}
                    {!calLoading && !calError && calEvents.length === 0 && !googleCalendarConnected && hasGoogleClientId && !googleCalendarDismissed && (
                      <div className="flex flex-col items-center py-3 gap-2">
                        <p className="text-xs text-[var(--color-text-muted)] text-center">
                          Import calendar events as tasks
                        </p>
                        <button
                          onClick={handleConnectCalendar}
                          disabled={calConnecting}
                          className="px-3 py-1 rounded-lg bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 transition-colors disabled:opacity-60"
                        >
                          {calConnecting ? 'Connecting...' : 'Connect Google Calendar'}
                        </button>
                        <button
                          onClick={() => setGoogleCalendarDismissed(true)}
                          className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
                        >
                          Don't show this
                        </button>
                      </div>
                    )}
                    {!calLoading && !calError && calEvents.length === 0 && googleCalendarConnected && (
                      <div className="flex flex-col items-center py-3 gap-2">
                        <button
                          onClick={loadCalendarEvents}
                          className="px-3 py-1 rounded-lg bg-blue-500/10 text-blue-500 text-xs font-medium hover:bg-blue-500/20 transition-colors"
                        >
                          Load today's events
                        </button>
                      </div>
                    )}
                    {!calLoading && !calError && calEvents.length === 0 && (!hasGoogleClientId || googleCalendarDismissed) && (
                      <p className="text-xs text-[var(--color-text-muted)] text-center py-4">
                        No calendar connected
                      </p>
                    )}
                    {!calLoading && !calError && calEvents.length > 0 && (
                      <>
                        {calEvents.map((event) => (
                          <div key={event.id} className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-[var(--color-surface)] transition-colors group">
                            <span className="flex-1 min-w-0 text-xs text-[var(--color-text-primary)] truncate">
                              {event.taskText}
                            </span>
                            <button
                              onClick={() => importCalEvent(event.id)}
                              className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors opacity-0 group-hover:opacity-100"
                              title="Add to Today"
                            >
                              +Today
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={importAllCalEvents}
                          className="w-full mt-1 px-2 py-1 rounded text-[10px] font-medium text-blue-500 hover:bg-blue-500/10 transition-colors"
                        >
                          Add all to Today
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* MIDDLE: Today's tasks */}
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-2 px-1">
                  Today ({todayItems.length})
                </h3>
                <div className="rounded-xl border border-blue-400/30 bg-blue-500/5 p-2 min-h-[200px] max-h-[60vh] overflow-y-auto">
                  {todayItems.length === 0 ? (
                    <p className="text-xs text-[var(--color-text-muted)] text-center py-6">
                      No tasks for today yet
                    </p>
                  ) : (
                    todayItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-[var(--color-surface)] transition-colors group">
                        <Checkbox
                          checked={item.completed}
                          onChange={(checked) => updateItem(item.id, { completed: checked })}
                        />
                        <span className={cn(
                          'flex-1 min-w-0 text-xs truncate',
                          item.completed ? 'line-through text-[var(--color-text-muted)]' : 'text-[var(--color-text-primary)]'
                        )}>
                          {item.text}
                        </span>
                        <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => moveInboxToTomorrow(item.id)}
                            className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] transition-colors"
                            title="Move to Tomorrow"
                          >
                            Tmrw
                          </button>
                          <button
                            onClick={() => sendToLater(item.id)}
                            className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)] transition-colors"
                            title="Move to Later"
                          >
                            Later
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                  <AddItemForm dayKey={dayKey} className="mt-1" />
                </div>
              </div>

              {/* RIGHT: Tomorrow & Later circles */}
              <div className="flex flex-col gap-3 w-24 flex-shrink-0 pt-6">
                <div className="flex flex-col items-center justify-center w-24 h-24 rounded-full border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface)] text-center">
                  <svg className="w-4 h-4 text-[var(--color-text-muted)] mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                  <span className="text-[10px] font-medium text-[var(--color-text-muted)]">Tomorrow</span>
                </div>
                <div className="flex flex-col items-center justify-center w-24 h-24 rounded-full border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface)] text-center">
                  <svg className="w-4 h-4 text-[var(--color-text-muted)] mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                  </svg>
                  <span className="text-[10px] font-medium text-[var(--color-text-muted)]">Later</span>
                </div>
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

        {/* Step 2: Top priorities */}
        {step === 2 && (
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

        {/* Step 3: Medium priorities */}
        {step === 3 && (
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

        {/* Step 4: Organize tasks */}
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

        {/* Step 5: Practice */}
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
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSavePractice(); } }}
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

        {/* Step 6: Summary */}
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
