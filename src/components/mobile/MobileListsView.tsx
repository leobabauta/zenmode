import { useState, useMemo } from 'react';
import { usePlannerStore, selectItemsForHashtag } from '../../store/usePlannerStore';
import { MobileTaskRow } from './MobileTaskRow';

export function MobileListsView() {
  const items = usePlannerStore((s) => s.items);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const allHashtags = useMemo(() => {
    const tagSet = new Set<string>();
    Object.values(items).forEach((item) => {
      const matches = item.text.match(/(#[\w-]+)/g);
      if (matches) matches.forEach((m) => tagSet.add(m.toLowerCase()));
    });
    return Array.from(tagSet).sort();
  }, [items]);

  if (selectedTag) {
    const tagItems = selectItemsForHashtag(items, selectedTag);
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center gap-3 px-5 pt-6 pb-4">
          <button
            onClick={() => setSelectedTag(null)}
            className="text-[var(--color-text-muted)] p-1"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">{selectedTag}</h1>
        </div>

        <div className="space-y-0.5">
          {tagItems.map((item) => (
            <MobileTaskRow key={item.id} item={item} />
          ))}
        </div>

        {tagItems.length === 0 && (
          <p className="px-5 text-sm text-[var(--color-text-muted)]">No items with {selectedTag}</p>
        )}

        <div className="h-24" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Lists</h1>
      </div>

      <div className="space-y-0.5">
        {allHashtags.map((tag) => (
          <button
            key={tag}
            onClick={() => setSelectedTag(tag)}
            className="w-full flex items-center gap-3 px-5 min-h-[44px] text-left hover:bg-[var(--color-surface)] transition-colors"
          >
            <svg className="w-5 h-5 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5l-3.9 19.5m-2.1-19.5l-3.9 19.5" />
            </svg>
            <span className="text-base text-[var(--color-text-primary)]">{tag}</span>
          </button>
        ))}
      </div>

      {allHashtags.length === 0 && (
        <p className="px-5 text-sm text-[var(--color-text-muted)]">No lists yet. Add #tags to your tasks to create lists.</p>
      )}

      <div className="h-24" />
    </div>
  );
}
