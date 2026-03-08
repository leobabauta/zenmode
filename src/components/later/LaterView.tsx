import { usePlannerStore, selectLaterItems } from '../../store/usePlannerStore';
import { ItemList } from '../items/ItemList';
import { AddItemForm } from '../forms/AddItemForm';
import { SortArchiveButtons } from '../ui/SortArchiveButtons';

export function LaterView() {
  const items = usePlannerStore((s) => s.items);
  const archiveCompleted = usePlannerStore((s) => s.archiveCompleted);
  const laterItems = selectLaterItems(items);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 mt-16">
          <h1 className="text-5xl font-bold dark:font-extrabold text-[var(--color-text-primary)]">
            Later
          </h1>
          <span className="text-xs text-[var(--color-text-muted)]">
            {laterItems.length} {laterItems.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        <div className="rounded-xl p-3 min-h-[80px]">
          <div className="min-h-[8px]">
            <ItemList items={laterItems} />
          </div>
          <AddItemForm dayKey={null} isLater className="mt-1" />
          <SortArchiveButtons
            items={laterItems}
            onArchive={() => archiveCompleted({ isLater: true })}
          />
        </div>
      </div>
    </div>
  );
}
