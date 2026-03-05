import { useState } from 'react';
import type { PlannerItem } from '../../types';

interface SortArchiveButtonsProps {
  items: PlannerItem[];
  onSort: () => void;
  onArchive?: () => void;
}

export function SortArchiveButtons({ items, onSort, onArchive }: SortArchiveButtonsProps) {
  const [sortConfirm, setSortConfirm] = useState(false);
  const [archiveConfirm, setArchiveConfirm] = useState(false);

  const hasCompleted = items.some((i) => i.completed);
  if (!hasCompleted) return null;

  return (
    <div className="flex items-center gap-3 mt-2 ml-[24px]">
      {sortConfirm ? (
        <span className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
          Move completed to top?
          <button
            onClick={() => { onSort(); setSortConfirm(false); }}
            className="text-blue-500 hover:text-blue-600 font-medium"
          >
            Confirm
          </button>
          <button
            onClick={() => setSortConfirm(false)}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
          >
            Cancel
          </button>
        </span>
      ) : (
        <button
          onClick={() => setSortConfirm(true)}
          className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
        >
          Sort completed &uarr;
        </button>
      )}

      {onArchive && (
        <>
          {archiveConfirm ? (
            <span className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
              Archive completed?
              <button
                onClick={() => { onArchive(); setArchiveConfirm(false); }}
                className="text-blue-500 hover:text-blue-600 font-medium"
              >
                Confirm
              </button>
              <button
                onClick={() => setArchiveConfirm(false)}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              onClick={() => setArchiveConfirm(true)}
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
            >
              Archive completed
            </button>
          )}
        </>
      )}
    </div>
  );
}
