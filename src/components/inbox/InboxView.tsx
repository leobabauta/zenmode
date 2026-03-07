import { usePlannerStore, selectInboxItems } from '../../store/usePlannerStore';
import { ItemList } from '../items/ItemList';
import { AddItemForm } from '../forms/AddItemForm';
import { SortArchiveButtons } from '../ui/SortArchiveButtons';

export function InboxView() {
  const items = usePlannerStore((s) => s.items);
  const archiveCompleted = usePlannerStore((s) => s.archiveCompleted);
  const inboxItems = selectInboxItems(items);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col items-center mb-4">
          <span className="text-lg font-bold uppercase tracking-wider text-blue-400">
            Inbox
          </span>
          <span className="text-xs text-[var(--color-text-muted)]">
            {inboxItems.length} {inboxItems.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        <div className="rounded-xl p-3 min-h-[80px]">
          <div className="min-h-[8px]">
            <ItemList items={inboxItems} />
          </div>
          <AddItemForm dayKey={null} className="mt-1" />
          <SortArchiveButtons
            items={inboxItems}
            onArchive={() => archiveCompleted({})}
          />
        </div>
      </div>
    </div>
  );
}
