import { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { usePlannerStore, selectLaterItems } from '../../store/usePlannerStore';
import { ItemList } from '../items/ItemList';
import { AddItemForm } from '../forms/AddItemForm';
import { cn } from '../../lib/utils';

export function LaterPanel() {
  const expanded = usePlannerStore((s) => s.laterExpanded);
  const setLaterExpanded = usePlannerStore((s) => s.setLaterExpanded);
  const setHashtagView = usePlannerStore((s) => s.setHashtagView);
  const items = usePlannerStore((s) => s.items);
  const laterItems = selectLaterItems(items);
  const { setNodeRef, isOver } = useDroppable({ id: 'later' });

  const allHashtags = useMemo(() => {
    const tagSet = new Set<string>();
    Object.values(items).forEach((item) => {
      const matches = item.text.match(/(#[\w-]+)/g);
      if (matches) matches.forEach((m) => tagSet.add(m.toLowerCase()));
    });
    return Array.from(tagSet).sort();
  }, [items]);

  return (
    <>
    <div className="border-t border-[var(--color-border)]">
      <button
        onClick={() => setLaterExpanded(!expanded)}
        className={cn(
          'w-full flex items-center gap-2 px-4 py-2.5',
          'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]',
          'hover:bg-[var(--color-surface)] transition-colors duration-100',
        )}
      >
        <svg
          className={cn('w-3 h-3 flex-shrink-0 transition-transform duration-150', expanded && 'rotate-90')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
        </svg>
        <span className="text-xs font-semibold uppercase tracking-wider">Later</span>
        {laterItems.length > 0 && (
          <span className="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--color-surface)] text-[var(--color-text-muted)]">
            {laterItems.length}
          </span>
        )}
      </button>

      {expanded && (
        <>
          <div
            ref={setNodeRef}
            className={cn(
              'px-2 pb-1 transition-colors duration-100',
              isOver && 'bg-[var(--color-accent-tint)]'
            )}
          >
            {laterItems.length === 0 ? (
              <div className="px-2 py-3">
                <span className="text-xs text-[var(--color-text-muted)]">
                  Items saved for later
                </span>
              </div>
            ) : (
              <ItemList items={laterItems} />
            )}
          </div>
          <div className="px-2 pb-2">
            <AddItemForm dayKey={null} isLater />
          </div>
        </>
      )}
    </div>
    {allHashtags.length > 0 && (
      <div className="border-t border-[var(--color-border)] px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Labels</span>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {allHashtags.map((tag) => (
            <button
              key={tag}
              onClick={() => setHashtagView(tag)}
              className="text-xs text-blue-400 hover:text-blue-500 hover:underline cursor-pointer"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    )}
    </>
  );
}
