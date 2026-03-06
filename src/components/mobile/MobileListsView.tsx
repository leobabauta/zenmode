import { useState, useMemo } from 'react';
import { usePlannerStore, selectLaterItems, selectArchivedItems, selectCustomListItems, selectItemsForHashtag } from '../../store/usePlannerStore';
import { MobileTaskRow } from './MobileTaskRow';

type SubView = null | { type: 'later' } | { type: 'archive' } | { type: 'customList'; id: string; name: string } | { type: 'label'; tag: string };

export function MobileListsView() {
  const items = usePlannerStore((s) => s.items);
  const customLists = usePlannerStore((s) => s.customLists);
  const [subView, setSubView] = useState<SubView>(null);

  const allHashtags = useMemo(() => {
    const tagSet = new Set<string>();
    Object.values(items).forEach((item) => {
      const matches = item.text.match(/(#[\w-]+)/g);
      if (matches) matches.forEach((m) => tagSet.add(m.toLowerCase()));
    });
    return Array.from(tagSet).sort();
  }, [items]);

  if (subView) {
    let title = '';
    let viewItems: ReturnType<typeof selectLaterItems> = [];

    if (subView.type === 'later') {
      title = 'Later';
      viewItems = selectLaterItems(items);
    } else if (subView.type === 'archive') {
      title = 'Archive';
      viewItems = selectArchivedItems(items);
    } else if (subView.type === 'customList') {
      title = subView.name;
      viewItems = selectCustomListItems(items, subView.id);
    } else if (subView.type === 'label') {
      title = subView.tag;
      viewItems = selectItemsForHashtag(items, subView.tag);
    }

    return (
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center gap-3 px-5 pt-6 pb-4">
          <button
            onClick={() => setSubView(null)}
            className="text-[var(--color-text-muted)] p-1"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">{title}</h1>
        </div>

        <div className="space-y-0.5">
          {viewItems.map((item) => (
            <MobileTaskRow key={item.id} item={item} />
          ))}
        </div>

        {viewItems.length === 0 && (
          <p className="px-5 text-sm text-[var(--color-text-muted)]">No items</p>
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
        {/* Later */}
        <button
          onClick={() => setSubView({ type: 'later' })}
          className="w-full flex items-center gap-3 px-5 min-h-[44px] text-left hover:bg-[var(--color-surface)] transition-colors"
        >
          <svg className="w-5 h-5 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-base text-[var(--color-text-primary)]">Later</span>
        </button>

        {/* Archive */}
        <button
          onClick={() => setSubView({ type: 'archive' })}
          className="w-full flex items-center gap-3 px-5 min-h-[44px] text-left hover:bg-[var(--color-surface)] transition-colors"
        >
          <svg className="w-5 h-5 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
          <span className="text-base text-[var(--color-text-primary)]">Archive</span>
        </button>

        {/* Custom lists */}
        {customLists.map((list) => (
          <button
            key={list.id}
            onClick={() => setSubView({ type: 'customList', id: list.id, name: list.name })}
            className="w-full flex items-center gap-3 px-5 min-h-[44px] text-left hover:bg-[var(--color-surface)] transition-colors"
          >
            <svg className="w-5 h-5 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            <span className="text-base text-[var(--color-text-primary)]">{list.name}</span>
          </button>
        ))}

        {/* Labels section */}
        {allHashtags.length > 0 && (
          <>
            <div className="px-5 pt-4 pb-2">
              <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Labels</span>
            </div>
            {allHashtags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSubView({ type: 'label', tag })}
                className="w-full flex items-center gap-3 px-5 min-h-[44px] text-left hover:bg-[var(--color-surface)] transition-colors"
              >
                <svg className="w-5 h-5 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                </svg>
                <span className="text-base text-[var(--color-text-primary)]">{tag}</span>
              </button>
            ))}
          </>
        )}
      </div>

      <div className="h-24" />
    </div>
  );
}
