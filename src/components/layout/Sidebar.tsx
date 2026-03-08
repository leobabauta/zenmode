import { useMemo, useState, useRef, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { usePlannerStore, LABEL_PALETTE } from '../../store/usePlannerStore';
import { useAuthStore } from '../../store/useAuthStore';
import { cn } from '../../lib/utils';
import { KeyboardShortcutsModal } from '../ui/KeyboardShortcutsModal';

const DEFAULT_NAV_ORDER = ['timeline', 'inbox', 'today', 'later', 'archive'];

const NAV_ITEM_DEFS: NavItemDef[] = [
  {
    id: 'timeline',
    label: 'Home',
    shortcut: 'H',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
      </svg>
    ),
  },
  {
    id: 'inbox',
    label: 'Inbox',
    shortcut: 'I',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4" />
      </svg>
    ),
  },
  {
    id: 'today',
    label: 'Today',
    shortcut: 'T',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'later',
    label: 'Later',
    shortcut: 'L',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8" />
      </svg>
    ),
  },
  {
    id: 'archive',
    label: 'Archive',
    shortcut: 'A',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    ),
  },
];

/** Drop target wrapper — registers with the outer AppShell DndContext for task drops */
function SidebarDropTarget({ id, children }: { id: string; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={cn('rounded-md transition-colors', isOver && 'ring-2 ring-blue-500/50 bg-blue-500/10')}>
      {children}
    </div>
  );
}

function DragHandle({ className }: { className?: string }) {
  return (
    <svg className={cn('w-3.5 h-3.5', className)} viewBox="0 0 16 16" fill="currentColor">
      <circle cx="5.5" cy="3.5" r="1.5" />
      <circle cx="10.5" cy="3.5" r="1.5" />
      <circle cx="5.5" cy="8" r="1.5" />
      <circle cx="10.5" cy="8" r="1.5" />
      <circle cx="5.5" cy="12.5" r="1.5" />
      <circle cx="10.5" cy="12.5" r="1.5" />
    </svg>
  );
}

interface NavItemDef {
  id: string;
  label: string;
  shortcut: string | undefined;
  icon: React.ReactNode;
}

function SortableNavItem({ nav, isActive, onSetView }: { nav: NavItemDef; isActive: boolean; onSetView: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `nav-${nav.id}` });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="group/nav relative flex items-center">
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-1/2 -translate-y-1/2 opacity-0 group-hover/nav:opacity-100 cursor-grab active:cursor-grabbing text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-opacity z-10"
      >
        <DragHandle />
      </div>
      <button
        onClick={onSetView}
        className={cn(
          'w-full flex items-center gap-2 pl-6 pr-3 py-1.5 rounded-md text-sm transition-colors duration-100',
          isActive
            ? 'bg-[var(--color-accent-tint)] text-[var(--color-accent)]'
            : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]',
        )}
      >
        {nav.icon}
        <span className="font-medium">{nav.label}</span>
        {nav.shortcut && (
          <kbd className="ml-auto text-[10px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1 py-0.5 text-[var(--color-text-muted)]">
            {nav.shortcut}
          </kbd>
        )}
      </button>
    </div>
  );
}

function SortableLabelRow({ tag, isActive, color, onSelect, onSetColor, onRename, onDelete, isDropOver }: {
  tag: string;
  isActive: boolean;
  color: string;
  onSelect: () => void;
  onSetColor: (color: string) => void;
  onRename: (newName: string) => void;
  onDelete: () => void;
  isDropOver?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `label-${tag}` });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `sidebar-label-${tag}` });
  const dropHighlight = isDropOver || isOver;
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  const mergedRef = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    setDropRef(node);
  };

  return (
    <div ref={mergedRef} style={style} className={cn('group/label relative flex items-center rounded-md transition-colors', dropHighlight && 'ring-2 ring-blue-500/50 bg-blue-500/10')}>
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-1/2 -translate-y-1/2 opacity-0 group-hover/label:opacity-100 cursor-grab active:cursor-grabbing text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-opacity z-10"
      >
        <DragHandle />
      </div>
      <LabelRowContent
        tag={tag}
        isActive={isActive}
        color={color}
        onSelect={onSelect}
        onSetColor={onSetColor}
        onRename={onRename}
        onDelete={onDelete}
      />
    </div>
  );
}

export function Sidebar() {
  const collapsed = usePlannerStore((s) => s.sidebarCollapsed);
  const toggleSidebar = usePlannerStore((s) => s.toggleSidebar);
  const view = usePlannerStore((s) => s.view);
  const setView = usePlannerStore((s) => s.setView);
  const setHashtagView = usePlannerStore((s) => s.setHashtagView);
  const setShowCommandPalette = usePlannerStore((s) => s.setShowCommandPalette);
  const setCommandPaletteAddTask = usePlannerStore((s) => s.setCommandPaletteAddTask);
  const items = usePlannerStore((s) => s.items);
  const activeHashtag = usePlannerStore((s) => s.activeHashtag);
  const getLabelColor = usePlannerStore((s) => s.getLabelColor);
  const setLabelColor = usePlannerStore((s) => s.setLabelColor);
  const updateItem = usePlannerStore((s) => s.updateItem);
  const customLists = usePlannerStore((s) => s.customLists);
  const activeListId = usePlannerStore((s) => s.activeListId);
  const addCustomList = usePlannerStore((s) => s.addCustomList);
  const setActiveListId = usePlannerStore((s) => s.setActiveListId);
  const navOrder = usePlannerStore((s) => s.navOrder);
  const labelOrder = usePlannerStore((s) => s.labelOrder);
  const setShowSettings = usePlannerStore((s) => s.setShowSettings);
  const user = useAuthStore((s) => s.user);

  const [creatingList, setCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [listsCollapsed, setListsCollapsed] = useState(false);
  const [labelsCollapsed, setLabelsCollapsed] = useState(false);
  const showShortcuts = usePlannerStore((s) => s.showShortcuts);
  const setShowShortcuts = usePlannerStore((s) => s.setShowShortcuts);
  const newListInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (creatingList) setTimeout(() => newListInputRef.current?.focus(), 0);
  }, [creatingList]);

  const allHashtags = useMemo(() => {
    const tagSet = new Set<string>();
    Object.values(items).forEach((item) => {
      const matches = item.text.match(/(#[\w-]+)/g);
      if (matches) matches.forEach((m) => tagSet.add(m.toLowerCase()));
    });
    return Array.from(tagSet).sort();
  }, [items]);

  // Sort hashtags by labelOrder, falling back to alphabetical for new ones
  const sortedHashtags = useMemo(() => {
    if (!labelOrder || labelOrder.length === 0) return allHashtags;
    const ordered: string[] = [];
    for (const tag of labelOrder) {
      if (allHashtags.includes(tag)) ordered.push(tag);
    }
    for (const tag of allHashtags) {
      if (!ordered.includes(tag)) ordered.push(tag);
    }
    return ordered;
  }, [allHashtags, labelOrder]);

  // Show stats only after a week of data
  const hasWeekOfData = useMemo(() => {
    const vals = Object.values(items);
    if (vals.length === 0) return false;
    const earliest = vals.reduce((min, item) => {
      const t = new Date(item.createdAt).getTime();
      return t < min ? t : min;
    }, Infinity);
    return Date.now() - earliest >= 7 * 24 * 60 * 60 * 1000;
  }, [items]);

  // Sort nav items by navOrder, falling back to default for any missing
  const effectiveNavOrder = navOrder && navOrder.length > 0 ? navOrder : DEFAULT_NAV_ORDER;
  const sortedNavItems = useMemo(() => {
    const byId = new Map(NAV_ITEM_DEFS.map((n) => [n.id, n]));
    const ordered: NavItemDef[] = [];
    for (const id of effectiveNavOrder) {
      const item = byId.get(id);
      if (item) ordered.push(item);
    }
    for (const item of NAV_ITEM_DEFS) {
      if (!ordered.find((o) => o.id === item.id)) ordered.push(item);
    }
    return ordered;
  }, [effectiveNavOrder]);

  if (collapsed) {
    return (
      <div className="flex-shrink-0 flex flex-col items-center pt-2 px-1">
        <button
          onClick={toggleSidebar}
          title="Show sidebar (F)"
          className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 3v18" />
          </svg>
        </button>
      </div>
    );
  }

  const handleCreateList = () => {
    const name = newListName.trim();
    if (name) {
      addCustomList(name);
      setNewListName('');
      setCreatingList(false);
    }
  };

  return (
    <aside className="flex-shrink-0 flex flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] h-full overflow-hidden w-56">
      {/* Top row: Logo + branding + collapse */}
      <div className="flex items-center justify-between px-3 pt-6 pb-4 border-b border-[var(--color-border)] flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <img
            src={import.meta.env.BASE_URL + 'zenmode-logo.svg'}
            alt=""
            className="w-7 h-7 flex-shrink-0"
          />
          <div className="min-w-0">
            <div className="text-sm font-bold text-[var(--color-text-primary)] leading-tight">zenmode</div>
            {user && (
              <div className="text-xs text-[var(--color-text-muted)] truncate leading-tight">
                {user.user_metadata?.full_name || user.email || ''}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={toggleSidebar}
          title="Hide sidebar (F)"
          className={cn(
            'p-1 rounded-md text-[var(--color-text-muted)]',
            'hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors',
          )}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 8H5m0 0l4-4m-4 4l4 4" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 16h14m0 0l-4-4m4 4l-4 4" />
          </svg>
        </button>
      </div>

      {/* Add task row */}
      <button
        onClick={() => { setCommandPaletteAddTask(true); setShowCommandPalette(true); }}
        className={cn(
          'flex items-center gap-2 px-3 py-2 mx-2 mt-4 rounded-md',
          'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]',
          'transition-colors duration-100 text-sm',
        )}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        <span>Add task</span>
        <kbd className="ml-auto text-[10px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1 py-0.5 text-[var(--color-text-muted)]">
          N
        </kbd>
      </button>

      {/* Nav items with drag-to-reorder + drop targets for task moves */}
      <nav className="mt-1 px-2 space-y-0.5">
        <SortableContext items={sortedNavItems.map((n) => `nav-${n.id}`)} strategy={verticalListSortingStrategy}>
          {sortedNavItems.map((nav) => {
            const isDropTarget = nav.id === 'inbox' || nav.id === 'later' || nav.id === 'archive';
            return isDropTarget ? (
              <SidebarDropTarget key={nav.id} id={`sidebar-${nav.id}`}>
                <SortableNavItem
                  nav={nav}
                  isActive={view === nav.id}
                  onSetView={() => setView(nav.id as Parameters<typeof setView>[0])}
                />
              </SidebarDropTarget>
            ) : (
              <SortableNavItem
                key={nav.id}
                nav={nav}
                isActive={view === nav.id}
                onSetView={() => setView(nav.id as Parameters<typeof setView>[0])}
              />
            );
          })}
        </SortableContext>
      </nav>

      {/* Custom lists section */}
      <div className="mt-3 px-3">
          <button
            onClick={() => setListsCollapsed(!listsCollapsed)}
            className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] px-1 hover:text-[var(--color-text-secondary)] transition-colors"
          >
            <svg className={cn('w-3 h-3 transition-transform', listsCollapsed && '-rotate-90')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
            Lists
          </button>
          {!listsCollapsed && (
            <>
              <div className="mt-1.5 space-y-0.5">
                {[...customLists].sort((a, b) => a.order - b.order).map((list) => {
                  const isActive = view === 'list' && activeListId === list.id;
                  return (
                    <SidebarDropTarget key={list.id} id={`sidebar-list-${list.id}`}>
                      <button
                        onClick={() => { setView('list'); setActiveListId(list.id); }}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors duration-100 text-left',
                          isActive
                            ? 'bg-[var(--color-accent-tint)] text-[var(--color-accent)]'
                            : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]',
                        )}
                      >
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <span className="truncate">{list.name}</span>
                      </button>
                    </SidebarDropTarget>
                  );
                })}
              </div>

              {/* Create new list */}
              <div className="mt-1">
                {creatingList ? (
                  <div className="px-3 py-1">
                    <input
                      ref={newListInputRef}
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateList();
                        if (e.key === 'Escape') { setCreatingList(false); setNewListName(''); }
                      }}
                      onBlur={() => { if (!newListName.trim()) { setCreatingList(false); setNewListName(''); } }}
                      placeholder="List name"
                      className="w-full text-sm bg-transparent border-b border-[var(--color-border)] outline-none py-1 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]"
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setCreatingList(true)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors duration-100',
                      'text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-secondary)]',
                    )}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Create new list</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>

      {/* Labels section with drag-to-reorder */}
      {sortedHashtags.length > 0 && (
        <div className="mt-4 px-3 overflow-y-auto">
          <button
            onClick={() => setLabelsCollapsed(!labelsCollapsed)}
            className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] px-1 hover:text-[var(--color-text-secondary)] transition-colors"
          >
            <svg className={cn('w-3 h-3 transition-transform', labelsCollapsed && '-rotate-90')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
            Labels
          </button>
          {!labelsCollapsed && (
          <div className="mt-1.5 space-y-0.5">
            <SortableContext items={sortedHashtags.map((t) => `label-${t}`)} strategy={verticalListSortingStrategy}>
              {sortedHashtags.map((tag) => (
                <SortableLabelRow
                  key={tag}
                  tag={tag}
                  isActive={view === 'hashtag' && activeHashtag === tag}
                  color={getLabelColor(tag)}
                  onSelect={() => setHashtagView(tag)}
                  onSetColor={(color) => setLabelColor(tag, color)}
                  onRename={(newTag) => {
                    const oldTag = tag;
                    const newHashtag = `#${newTag}`;
                    if (newHashtag.toLowerCase() !== oldTag.toLowerCase()) {
                      setLabelColor(newHashtag, getLabelColor(oldTag));
                      Object.values(items).forEach((item) => {
                        if (item.text.toLowerCase().includes(oldTag.toLowerCase())) {
                          const updated = item.text.replace(new RegExp(oldTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), newHashtag);
                          updateItem(item.id, { text: updated });
                        }
                      });
                      setHashtagView(newHashtag.toLowerCase());
                    }
                  }}
                  onDelete={() => {
                    Object.values(items).forEach((item) => {
                      if (item.text.toLowerCase().includes(tag.toLowerCase())) {
                        const updated = item.text.replace(new RegExp(`\\s*${tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'gi'), ' ').trim();
                        updateItem(item.id, { text: updated });
                      }
                    });
                    setView('timeline');
                  }}
                />
              ))}
            </SortableContext>
          </div>
          )}
        </div>
      )}
      {/* Spacer to push bottom items down */}
      <div className="flex-1" />

      {/* Bottom section: Stats + Settings */}
      <div className="px-2 pb-2 space-y-0.5 flex-shrink-0 border-t border-[var(--color-border)] pt-2 mt-2">
        {hasWeekOfData && (
          <button
            onClick={() => setView('stats' as Parameters<typeof setView>[0])}
            className={cn(
              'w-full flex items-center gap-2 pl-6 pr-3 py-1.5 rounded-md text-sm transition-colors duration-100',
              view === 'stats'
                ? 'bg-[var(--color-accent-tint)] text-[var(--color-accent)]'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]',
            )}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="font-medium">Stats</span>
          </button>
        )}
        <button
          onClick={() => setShowShortcuts(true)}
          className={cn(
            'w-full flex items-center gap-2 pl-6 pr-3 py-1.5 rounded-md text-sm transition-colors duration-100',
            'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]',
          )}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span className="font-medium">Shortcuts</span>
          <kbd className="ml-auto text-[10px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1 py-0.5 text-[var(--color-text-muted)]">
            ?
          </kbd>
        </button>
        <button
          onClick={() => setShowSettings(true)}
          className={cn(
            'w-full flex items-center gap-2 pl-6 pr-3 py-1.5 rounded-md text-sm transition-colors duration-100',
            'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]',
          )}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="font-medium">Settings</span>
        </button>
      </div>
      {showShortcuts && <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </aside>
  );
}

/** Label row content with 3-dot context menu (used inside SortableLabelRow) */
function LabelRowContent({
  tag,
  isActive,
  color,
  onSelect,
  onSetColor,
  onRename,
  onDelete,
}: {
  tag: string;
  isActive: boolean;
  color: string;
  onSelect: () => void;
  onSetColor: (color: string) => void;
  onRename: (newName: string) => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) setTimeout(() => editRef.current?.focus(), 0);
  }, [editing]);

  const closeMenu = () => { setMenuOpen(false); setColorPickerOpen(false); };

  const startEdit = () => {
    closeMenu();
    setEditing(true);
    setEditValue(tag.slice(1));
  };

  const submitEdit = () => {
    const newTag = editValue.trim().replace(/^#/, '');
    if (newTag) onRename(newTag);
    setEditing(false);
  };

  return (
    <div className="flex-1 min-w-0 relative flex items-center">
      {editing ? (
        <div className="flex items-center gap-1 pl-6 pr-3 py-1.5 w-full">
          <span className="text-sm" style={{ color }}>#</span>
          <input
            ref={editRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitEdit();
              if (e.key === 'Escape') setEditing(false);
            }}
            onBlur={submitEdit}
            className="text-sm bg-transparent outline-none flex-1 min-w-0"
            style={{ color, borderBottom: `1px solid ${color}40` }}
          />
        </div>
      ) : (
        <button
          onClick={onSelect}
          className={cn(
            'w-full flex items-center gap-2 pl-6 pr-3 py-1.5 rounded-md text-sm transition-colors duration-100 text-left',
            isActive
              ? 'bg-[var(--color-accent-tint)]'
              : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]',
          )}
        >
          <span style={{ color }}>#</span>
          <span style={{ color }}>{tag.slice(1)}</span>
        </button>
      )}

      {/* 3-dot menu trigger */}
      {!editing && (
        <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/label:opacity-100 transition-opacity" ref={menuRef}>
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); setColorPickerOpen(false); }}
            className="p-0.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="5" cy="12" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="19" cy="12" r="1.5" />
            </svg>
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={closeMenu} />
              <div className="absolute right-0 top-full mt-1 z-50 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg shadow-lg py-1 min-w-[140px]">
                <button
                  onClick={startEdit}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)] transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit label
                </button>
                <button
                  onClick={() => setColorPickerOpen(!colorPickerOpen)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)] transition-colors"
                >
                  <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  Change color
                </button>

                {colorPickerOpen && (
                  <div className="px-2 py-2 border-t border-[var(--color-border)] mt-1">
                    <div className="grid grid-cols-5 gap-1.5">
                      {LABEL_PALETTE.map((c) => (
                        <button
                          key={c}
                          onClick={() => { onSetColor(c); closeMenu(); }}
                          className={cn(
                            'w-6 h-6 rounded-full transition-transform hover:scale-110',
                            c === color && 'ring-2 ring-offset-1 ring-[var(--color-text-primary)]',
                          )}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => { closeMenu(); onDelete(); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
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
      )}
    </div>
  );
}
