import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { usePlannerStore, selectInboxItems, selectLaterItems } from '../../store/usePlannerStore';
import { cn } from '../../lib/utils';

type PaletteItem =
  | { kind: 'nav'; id: string; label: string; icon: string }
  | { kind: 'hashtag'; id: string; tag: string }
  | { kind: 'task'; id: string; text: string };

interface Section {
  title: string;
  items: PaletteItem[];
}

const NAV_ITEMS: PaletteItem[] = [
  { kind: 'nav', id: 'nav-today', label: 'Today', icon: '📅' },
  { kind: 'nav', id: 'nav-timeline', label: 'Home', icon: '🏠' },
  { kind: 'nav', id: 'nav-inbox', label: 'Inbox', icon: '📥' },
  { kind: 'nav', id: 'nav-later', label: 'Later', icon: '📦' },
];

export function CommandPalette() {
  const [query, setQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const items = usePlannerStore((s) => s.items);
  const setShowCommandPalette = usePlannerStore((s) => s.setShowCommandPalette);

  // Extract unique hashtags from all items
  const allHashtags = useMemo(() => {
    const tagSet = new Set<string>();
    Object.values(items).forEach((item) => {
      const matches = item.text.match(/(#[\w-]+)/g);
      if (matches) {
        matches.forEach((m) => tagSet.add(m.toLowerCase()));
      }
    });
    return Array.from(tagSet).sort();
  }, [items]);

  // Build sections based on query
  const sections = useMemo((): Section[] => {
    const q = query.trim().toLowerCase();

    if (!q) {
      const result: Section[] = [{ title: 'Navigation', items: [...NAV_ITEMS] }];
      if (allHashtags.length > 0) {
        result.push({
          title: 'Labels',
          items: allHashtags.map((tag) => ({ kind: 'hashtag' as const, id: `hashtag-${tag}`, tag })),
        });
      }
      return result;
    }

    const result: Section[] = [];

    // Filter nav items
    const matchedNav = NAV_ITEMS.filter((n) => n.kind === 'nav' && n.label.toLowerCase().includes(q));
    if (matchedNav.length > 0) {
      result.push({ title: 'Navigation', items: matchedNav });
    }

    // Filter hashtags — match against both the full tag and without the #
    const qWithout = q.startsWith('#') ? q.slice(1) : q;
    const matchedTags = allHashtags
      .filter((tag) => tag.includes(q) || tag.slice(1).includes(qWithout))
      .map((tag) => ({ kind: 'hashtag' as const, id: `hashtag-${tag}`, tag }));
    if (matchedTags.length > 0) {
      result.push({ title: 'Labels', items: matchedTags });
    }

    // Search tasks (exclude children, limit 10)
    const matchedTasks = Object.values(items)
      .filter((item) => !item.parentId && item.text.toLowerCase().includes(q))
      .slice(0, 10)
      .map((item) => ({ kind: 'task' as const, id: item.id, text: item.text }));
    if (matchedTasks.length > 0) {
      result.push({ title: 'Tasks', items: matchedTasks });
    }

    return result;
  }, [query, items, allHashtags]);

  // Flat list for keyboard indexing
  const flatItems = useMemo(
    () => sections.flatMap((s) => s.items),
    [sections],
  );

  // Reset highlight when query changes
  useEffect(() => {
    setHighlightIndex(0);
  }, [query]);

  // Auto-focus input
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    const el = listRef.current?.querySelector('[data-highlighted="true"]');
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [highlightIndex]);

  const close = useCallback(() => {
    setShowCommandPalette(false);
  }, [setShowCommandPalette]);

  const handleSelect = useCallback((item: PaletteItem) => {
    const store = usePlannerStore.getState();

    switch (item.kind) {
      case 'nav':
        if (item.id === 'nav-today') {
          store.setView('today');
        } else if (item.id === 'nav-timeline') {
          store.setView('timeline');
        } else if (item.id === 'nav-inbox') {
          if (store.view !== 'timeline') store.setView('timeline');
          if (store.sidebarCollapsed) store.toggleSidebar();
          const inboxItems = selectInboxItems(store.items);
          if (inboxItems.length > 0) store.startSelection(inboxItems[0].id);
        } else if (item.id === 'nav-later') {
          if (store.view !== 'timeline') store.setView('timeline');
          if (store.sidebarCollapsed) store.toggleSidebar();
          if (!store.laterExpanded) store.setLaterExpanded(true);
          const laterItems = selectLaterItems(store.items);
          if (laterItems.length > 0) store.startSelection(laterItems[0].id);
        }
        break;
      case 'hashtag':
        store.setHashtagView(item.tag);
        break;
      case 'task':
        store.setExpandedTask(item.id);
        break;
    }

    close();
  }, [close]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => Math.min(prev + 1, flatItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatItems[highlightIndex]) {
        handleSelect(flatItems[highlightIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  };

  let itemCounter = -1;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={close} />

      {/* Modal */}
      <div className="fixed left-1/2 top-[20%] -translate-x-1/2 w-[500px] z-50 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[60vh]">
        {/* Search input */}
        <div className="px-4 pt-4 pb-3 flex items-center gap-3">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search tasks, labels, or navigate..."
            className="flex-1 px-3 py-2 text-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none focus:ring-1 focus:ring-[var(--color-accent)]/30"
          />
          <kbd className="text-[10px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1.5 py-0.5 text-[var(--color-text-muted)] shrink-0">
            ⌘K
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="overflow-y-auto flex-1">
          {flatItems.length === 0 && query.trim() ? (
            <div className="px-4 py-6 text-sm text-[var(--color-text-muted)] text-center">
              No results found
            </div>
          ) : (
            sections.map((section) => (
              <div key={section.title}>
                <div className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  {section.title}
                </div>
                {section.items.map((item) => {
                  itemCounter++;
                  const idx = itemCounter;
                  const isHighlighted = idx === highlightIndex;

                  return (
                    <button
                      key={item.kind + '-' + item.id}
                      data-highlighted={isHighlighted}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setHighlightIndex(idx)}
                      className={cn(
                        'w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors',
                        'hover:bg-[var(--color-surface)]',
                        isHighlighted && 'bg-[var(--color-accent-tint)]',
                      )}
                    >
                      {item.kind === 'nav' && (
                        <>
                          <span className="w-5 text-center">{item.icon}</span>
                          <span className={cn(
                            'font-medium',
                            isHighlighted ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-primary)]',
                          )}>{item.label}</span>
                        </>
                      )}
                      {item.kind === 'hashtag' && (
                        <span className={cn(
                          'font-medium',
                          isHighlighted ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-primary)]',
                        )}>{item.tag}</span>
                      )}
                      {item.kind === 'task' && (
                        <span className={cn(
                          'truncate',
                          isHighlighted ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-primary)]',
                        )}>{item.text}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
