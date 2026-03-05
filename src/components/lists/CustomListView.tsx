import { useState, useRef, useEffect } from 'react';
import { usePlannerStore, selectCustomListItems } from '../../store/usePlannerStore';
import { ItemList } from '../items/ItemList';
import { AddItemForm } from '../forms/AddItemForm';

export function CustomListView() {
  const items = usePlannerStore((s) => s.items);
  const activeListId = usePlannerStore((s) => s.activeListId);
  const customLists = usePlannerStore((s) => s.customLists);
  const renameCustomList = usePlannerStore((s) => s.renameCustomList);
  const deleteCustomList = usePlannerStore((s) => s.deleteCustomList);

  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const editRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const list = customLists.find((l) => l.id === activeListId);
  const listItems = activeListId ? selectCustomListItems(items, activeListId) : [];

  useEffect(() => {
    if (editing) setTimeout(() => editRef.current?.focus(), 0);
  }, [editing]);

  if (!list || !activeListId) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--color-text-muted)]">
        Select a list from the sidebar
      </div>
    );
  }

  const startEdit = () => {
    setMenuOpen(false);
    setEditing(true);
    setEditValue(list.name);
  };

  const submitEdit = () => {
    const name = editValue.trim();
    if (name && name !== list.name) {
      renameCustomList(list.id, name);
    }
    setEditing(false);
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col items-center mb-4">
          {editing ? (
            <input
              ref={editRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitEdit();
                if (e.key === 'Escape') setEditing(false);
              }}
              onBlur={submitEdit}
              className="text-lg font-bold bg-transparent outline-none text-center text-blue-400 border-b border-blue-400/40 px-2"
            />
          ) : (
            <span className="text-lg font-bold uppercase tracking-wider text-blue-400">
              {list.name}
            </span>
          )}
          <span className="text-xs text-[var(--color-text-muted)]">
            {listItems.length} {listItems.length === 1 ? 'item' : 'items'}
          </span>

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
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg shadow-lg py-1 min-w-[140px]">
                  <button
                    onClick={startEdit}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)] transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Rename list
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); deleteCustomList(list.id); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete list
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="rounded-xl p-3 min-h-[80px]">
          <div className="min-h-[8px]">
            <ItemList items={listItems} />
          </div>
          <AddItemForm dayKey={null} className="mt-1" listId={activeListId} />
        </div>
      </div>
    </div>
  );
}
