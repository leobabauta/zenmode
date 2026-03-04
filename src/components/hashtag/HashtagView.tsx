import { usePlannerStore, selectItemsForHashtag } from '../../store/usePlannerStore';
import { ItemList } from '../items/ItemList';

export function HashtagView() {
  const items = usePlannerStore((s) => s.items);
  const activeHashtag = usePlannerStore((s) => s.activeHashtag);

  if (!activeHashtag) return null;

  const taggedItems = selectItemsForHashtag(items, activeHashtag);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col items-center mb-4">
          <span className="text-lg font-bold text-blue-400">
            {activeHashtag}
          </span>
          <span className="text-xs text-[var(--color-text-muted)]">
            {taggedItems.length} {taggedItems.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        <div className="rounded-xl p-3 min-h-[80px]">
          <div className="min-h-[8px]">
            <ItemList items={taggedItems} />
          </div>
        </div>
      </div>
    </div>
  );
}
