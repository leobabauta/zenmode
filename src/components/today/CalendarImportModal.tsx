import { useState, useEffect, useCallback } from 'react';
import { fetchTodayEvents, formatEventAsTask } from '../../lib/googleCalendar';
import { usePlannerStore } from '../../store/usePlannerStore';
import { toDayKey } from '../../lib/dates';

interface CalendarImportModalProps {
  open: boolean;
  onClose: () => void;
}

interface EventItem {
  id: string;
  taskText: string;
  selected: boolean;
}

export function CalendarImportModal({ open, onClose }: CalendarImportModalProps) {
  const addItem = usePlannerStore((s) => s.addItem);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const calEvents = await fetchTodayEvents();
      setEvents(
        calEvents.map((e) => ({
          id: e.id,
          taskText: formatEventAsTask(e),
          selected: true,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) loadEvents();
  }, [open, loadEvents]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const toggleEvent = (id: string) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, selected: !e.selected } : e))
    );
  };

  const handleImport = () => {
    const dayKey = toDayKey(new Date());
    for (const event of events) {
      if (event.selected) {
        addItem({ type: 'task', text: event.taskText, dayKey });
      }
    }
    onClose();
  };

  const selectedCount = events.filter((e) => e.selected).length;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-[60]" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[61] bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl shadow-2xl p-6 w-[400px] max-h-[80vh] flex flex-col">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-primary)] mb-4">
          Import from Google Calendar
        </h2>

        {loading && (
          <div className="flex-1 flex items-center justify-center py-8">
            <span className="text-sm text-[var(--color-text-muted)]">Loading events...</span>
          </div>
        )}

        {error && (
          <div className="flex-1 py-8">
            <p className="text-sm text-red-500 mb-3">{error}</p>
            <button
              onClick={loadEvents}
              className="text-sm text-[var(--color-accent)] hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && events.length === 0 && (
          <div className="flex-1 flex items-center justify-center py-8">
            <span className="text-sm text-[var(--color-text-muted)]">
              No events on your calendar today
            </span>
          </div>
        )}

        {!loading && !error && events.length > 0 && (
          <>
            <div className="flex-1 overflow-y-auto space-y-1 mb-4">
              {events.map((event) => (
                <label
                  key={event.id}
                  className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-[var(--color-surface)] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={event.selected}
                    onChange={() => toggleEvent(event.id)}
                    className="rounded"
                  />
                  <span className="text-sm text-[var(--color-text-primary)]">
                    {event.taskText}
                  </span>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={selectedCount === 0}
                className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Import {selectedCount > 0 ? `(${selectedCount})` : ''}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
