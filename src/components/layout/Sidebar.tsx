import { useMemo } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';
import { ProfileMenu } from '../ui/ProfileMenu';
import { cn } from '../../lib/utils';

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

  const allHashtags = useMemo(() => {
    const tagSet = new Set<string>();
    Object.values(items).forEach((item) => {
      const matches = item.text.match(/(#[\w-]+)/g);
      if (matches) matches.forEach((m) => tagSet.add(m.toLowerCase()));
    });
    return Array.from(tagSet).sort();
  }, [items]);

  if (collapsed) return null;

  const navItems = [
    {
      id: 'inbox' as const,
      label: 'Inbox',
      shortcut: 'GI',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4" />
        </svg>
      ),
    },
    {
      id: 'today' as const,
      label: 'Today',
      shortcut: 'T',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'later' as const,
      label: 'Later',
      shortcut: 'GL',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8" />
        </svg>
      ),
    },
  ];

  return (
    <aside className="flex-shrink-0 flex flex-col border-r border-[var(--color-border)] bg-[var(--color-bg)] h-full overflow-hidden w-56">
      {/* Top row: ProfileMenu + collapse button */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--color-border)] flex-shrink-0">
        <ProfileMenu />
        <button
          onClick={toggleSidebar}
          title="Hide sidebar (F)"
          className={cn(
            'p-1 rounded-md text-[var(--color-text-muted)]',
            'hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors',
          )}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 3v18" />
          </svg>
        </button>
      </div>

      {/* Add task row */}
      <button
        onClick={() => { setCommandPaletteAddTask(true); setShowCommandPalette(true); }}
        className={cn(
          'flex items-center gap-2 px-3 py-2 mx-2 mt-2 rounded-md',
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

      {/* Nav items */}
      <nav className="mt-1 px-2 space-y-0.5">
        {navItems.map((nav) => {
          const isActive = view === nav.id;
          return (
            <button
              key={nav.id}
              onClick={() => setView(nav.id)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors duration-100',
                isActive
                  ? 'bg-[var(--color-accent-tint)] text-[var(--color-accent)]'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]',
              )}
            >
              {nav.icon}
              <span className="font-medium">{nav.label}</span>
              <kbd className="ml-auto text-[10px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1 py-0.5 text-[var(--color-text-muted)]">
                {nav.shortcut}
              </kbd>
            </button>
          );
        })}
      </nav>

      {/* Labels section */}
      {allHashtags.length > 0 && (
        <div className="mt-4 px-3 flex-1 overflow-y-auto">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] px-1">
            Labels
          </span>
          <div className="mt-1.5 space-y-0.5">
            {allHashtags.map((tag) => {
              const isActive = view === 'hashtag' && activeHashtag === tag;
              return (
                <button
                  key={tag}
                  onClick={() => setHashtagView(tag)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors duration-100 text-left',
                    isActive
                      ? 'bg-[var(--color-accent-tint)] text-[var(--color-accent)]'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]',
                  )}
                >
                  <span className="text-xs">#</span>
                  <span>{tag.slice(1)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}
