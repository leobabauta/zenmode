import { useEffect, useRef } from 'react';
import { usePlannerStore, selectInboxItems } from '../../store/usePlannerStore';
import { ItemList } from '../items/ItemList';
import { AddItemForm } from '../forms/AddItemForm';
import { SortArchiveButtons } from '../ui/SortArchiveButtons';
import { EmptyInbox } from '../ui/EmptyState';

export function InboxView() {
  const items = usePlannerStore((s) => s.items);
  const archiveCompleted = usePlannerStore((s) => s.archiveCompleted);
  const startSelection = usePlannerStore((s) => s.startSelection);
  const selectionFocusId = usePlannerStore((s) => s.selectionFocusId);
  const inboxItems = selectInboxItems(items);

  const isEmpty = inboxItems.length === 0;
  const inboxIds = new Set(inboxItems.map((i) => i.id));

  // Auto-select first item on load, and re-select first item when focused item leaves inbox
  const didAutoSelect = useRef(false);
  useEffect(() => {
    if (isEmpty) {
      didAutoSelect.current = false;
      return;
    }
    // Initial auto-select
    if (!didAutoSelect.current) {
      didAutoSelect.current = true;
      startSelection(inboxItems[0].id);
      return;
    }
    // If focused item is no longer in inbox, select the first item
    if (selectionFocusId && !inboxIds.has(selectionFocusId)) {
      startSelection(inboxItems[0].id);
    }
  }, [isEmpty, selectionFocusId, inboxItems.length]);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 mt-16">
          <h1 className="text-5xl font-bold dark:font-extrabold text-[var(--color-text-primary)]">
            Inbox
          </h1>
          {!isEmpty && (
            <div className="mt-2 text-xs text-[var(--color-text-muted)]">
              <p className="mb-1">Quickly process your inbox:</p>
              <div className="flex flex-col gap-0.5">
                <span><kbd className="font-mono bg-[var(--color-surface)] px-1 py-0.5 rounded text-[10px]">Shift+T</kbd> Move to Today</span>
                <span><kbd className="font-mono bg-[var(--color-surface)] px-1 py-0.5 rounded text-[10px]">Shift+E</kbd> Move to Later</span>
                <span><kbd className="font-mono bg-[var(--color-surface)] px-1 py-0.5 rounded text-[10px]">M</kbd> Move to a specific day</span>
                <span><kbd className="font-mono bg-[var(--color-surface)] px-1 py-0.5 rounded text-[10px]">dd</kbd> Delete</span>
              </div>
            </div>
          )}
        </div>

        {isEmpty ? (
          <EmptyInbox />
        ) : (
          <div className="min-h-[80px]">
            <div className="min-h-[8px]">
              <ItemList items={inboxItems} />
            </div>
            <AddItemForm dayKey={null} className="mt-1" />
            <SortArchiveButtons
              items={inboxItems}
              onArchive={() => archiveCompleted({})}
            />
          </div>
        )}
      </div>
    </div>
  );
}
