import { useEffect } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';

export function DeleteRecurrenceModal() {
  const deleteConfirmItemId = usePlannerStore((s) => s.deleteConfirmItemId);
  const confirmDeleteSingle = usePlannerStore((s) => s.confirmDeleteSingle);
  const confirmDeleteAllFuture = usePlannerStore((s) => s.confirmDeleteAllFuture);
  const cancelDelete = usePlannerStore((s) => s.cancelDelete);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelDelete();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cancelDelete]);

  if (!deleteConfirmItemId) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-[60]" onClick={cancelDelete} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[61] bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl shadow-2xl p-6 w-[340px]">
        <p className="text-sm font-medium text-[var(--color-text-primary)] mb-4">
          This is a recurring task. What would you like to do?
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => confirmDeleteSingle(deleteConfirmItemId)}
            className="w-full text-sm px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors"
          >
            Delete just this one
          </button>
          <button
            onClick={() => confirmDeleteAllFuture(deleteConfirmItemId)}
            className="w-full text-sm px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            Delete all future occurrences
          </button>
          <button
            onClick={cancelDelete}
            className="w-full text-sm px-4 py-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}
