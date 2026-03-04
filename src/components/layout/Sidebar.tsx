import { usePlannerStore } from '../../store/usePlannerStore';
import { InboxPanel } from '../inbox/InboxPanel';
import { LaterPanel } from '../inbox/LaterPanel';
import { cn } from '../../lib/utils';

export function Sidebar() {
  const collapsed = usePlannerStore((s) => s.sidebarCollapsed);
  const toggleSidebar = usePlannerStore((s) => s.toggleSidebar);

  if (collapsed) return null;

  return (
    <aside className="flex-shrink-0 flex flex-col border-r border-[var(--color-border)] bg-[var(--color-bg)] h-full overflow-hidden w-56">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] flex-shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4" />
          </svg>
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
            Inbox
          </span>
        </div>
        <button
          onClick={toggleSidebar}
          title="Hide inbox (F)"
          className={cn(
            'p-1 rounded-md text-[var(--color-text-muted)]',
            'hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors',
          )}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        <InboxPanel />
        <LaterPanel />
      </div>
    </aside>
  );
}
