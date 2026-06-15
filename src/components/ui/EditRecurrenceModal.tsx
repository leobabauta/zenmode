import { useEffect } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';

export function EditRecurrenceModal() {
  const editConfirmItemId = usePlannerStore((s) => s.editConfirmItemId);
  const confirmEditSingle = usePlannerStore((s) => s.confirmEditSingle);
  const confirmEditAllFuture = usePlannerStore((s) => s.confirmEditAllFuture);
  const cancelEditRecurring = usePlannerStore((s) => s.cancelEditRecurring);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelEditRecurring();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cancelEditRecurring]);

  if (!editConfirmItemId) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-[60]" onClick={cancelEditRecurring} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[61] bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl shadow-2xl p-6 w-[340px]">
        <p className="text-sm font-medium text-[var(--color-text-primary)] mb-4">
          This is a recurring task. What would you like to edit?
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={confirmEditSingle}
            className="w-full text-sm px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors"
          >
            Edit just this one
          </button>
          <button
            onClick={confirmEditAllFuture}
            className="w-full text-sm px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white hover:opacity-90 transition-opacity"
          >
            Edit this and all future occurrences
          </button>
          <button
            onClick={cancelEditRecurring}
            className="w-full text-sm px-4 py-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}
