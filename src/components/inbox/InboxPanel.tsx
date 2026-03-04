import { useDroppable } from '@dnd-kit/core';
import { usePlannerStore, selectInboxItems } from '../../store/usePlannerStore';
import { ItemList } from '../items/ItemList';
import { AddItemForm } from '../forms/AddItemForm';
import { cn } from '../../lib/utils';

export function InboxPanel() {
  const items = usePlannerStore((s) => s.items);
  const inboxItems = selectInboxItems(items);
  const { setNodeRef, isOver } = useDroppable({ id: 'inbox' });

  return (
    <div className="flex flex-col">
      <div
        ref={setNodeRef}
        className={cn(
          'p-2 transition-colors duration-100',
          isOver && 'bg-[var(--color-accent-tint)]'
        )}
      >
        {inboxItems.length === 0 ? (
          <div className="px-2 py-3">
            <span className="text-xs text-[var(--color-text-muted)]">
              Drop items here or add below
            </span>
          </div>
        ) : (
          <ItemList items={inboxItems} />
        )}
      </div>
      <div className="px-2 pb-2">
        <AddItemForm dayKey={null} />
      </div>
    </div>
  );
}
