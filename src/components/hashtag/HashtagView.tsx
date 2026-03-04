import { useState, useRef } from 'react';
import { usePlannerStore, selectItemsForHashtag } from '../../store/usePlannerStore';
import { ItemList } from '../items/ItemList';
import { AddItemForm } from '../forms/AddItemForm';
import { cn } from '../../lib/utils';

export function HashtagView() {
  const items = usePlannerStore((s) => s.items);
  const activeHashtag = usePlannerStore((s) => s.activeHashtag);
  const updateItem = usePlannerStore((s) => s.updateItem);
  const setView = usePlannerStore((s) => s.setView);
  const setHashtagView = usePlannerStore((s) => s.setHashtagView);

  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const editRef = useRef<HTMLInputElement>(null);

  if (!activeHashtag) return null;

  const taggedItems = selectItemsForHashtag(items, activeHashtag);

  // Close menu on outside click
  const handleBackdropClick = () => setMenuOpen(false);

  const startEdit = () => {
    setMenuOpen(false);
    setEditing(true);
    setEditValue(activeHashtag.slice(1)); // remove '#'
    setTimeout(() => editRef.current?.focus(), 0);
  };

  const submitEdit = () => {
    const newTag = editValue.trim().replace(/^#/, '');
    if (!newTag) {
      setEditing(false);
      return;
    }
    const oldTag = activeHashtag;
    const newHashtag = `#${newTag}`;
    if (newHashtag.toLowerCase() !== oldTag.toLowerCase()) {
      // Rename in all items
      Object.values(items).forEach((item) => {
        if (item.text.toLowerCase().includes(oldTag.toLowerCase())) {
          const updated = item.text.replace(new RegExp(oldTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), newHashtag);
          updateItem(item.id, { text: updated });
        }
      });
      setHashtagView(newHashtag.toLowerCase());
    }
    setEditing(false);
  };

  const deleteLabel = () => {
    setMenuOpen(false);
    // Remove the hashtag from all items
    Object.values(items).forEach((item) => {
      if (item.text.toLowerCase().includes(activeHashtag.toLowerCase())) {
        const updated = item.text.replace(new RegExp(`\\s*${activeHashtag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'gi'), ' ').trim();
        updateItem(item.id, { text: updated });
      }
    });
    setView('timeline');
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col items-center mb-4">
          {editing ? (
            <div className="flex items-center gap-1">
              <span className="text-lg font-bold text-blue-400">#</span>
              <input
                ref={editRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitEdit();
                  if (e.key === 'Escape') setEditing(false);
                }}
                onBlur={submitEdit}
                className="text-lg font-bold text-blue-400 bg-transparent outline-none border-b border-blue-400/40 px-1"
              />
            </div>
          ) : (
            <span className="text-lg font-bold text-blue-400">
              {activeHashtag}
            </span>
          )}

          {/* 3-dot menu */}
          <div className="relative mt-1" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="5" cy="12" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="19" cy="12" r="1.5" />
              </svg>
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={handleBackdropClick} />
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg shadow-lg py-1 min-w-[140px]">
                  <button
                    onClick={startEdit}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left',
                      'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)] transition-colors',
                    )}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit label
                  </button>
                  <button
                    onClick={deleteLabel}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left',
                      'text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors',
                    )}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete label
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="rounded-xl p-3 min-h-[80px]">
          <div className="min-h-[8px]">
            <ItemList items={taggedItems} />
          </div>
          <AddItemForm dayKey={null} className="mt-1" />
        </div>
      </div>
    </div>
  );
}
