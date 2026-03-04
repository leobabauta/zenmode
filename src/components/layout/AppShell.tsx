import { useEffect, useRef, useState, useCallback } from 'react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { Sidebar } from './Sidebar';
import { MainContent } from './MainContent';
import { ThemeToggle } from '../ui/ThemeToggle';
import { ProfileMenu } from '../ui/ProfileMenu';
import { SettingsView } from '../settings/SettingsView';
import { TodayView } from '../today/TodayView';
import { HashtagView } from '../hashtag/HashtagView';
import { TaskItem } from '../items/TaskItem';
import { NoteItem } from '../items/NoteItem';
import { ExpandedTaskView } from '../items/ExpandedTaskView';
import { MoveModal } from '../ui/MoveModal';
import { CommandPalette } from '../ui/CommandPalette';
import { FullScreenConfetti } from '../ui/FullScreenConfetti';
import { useDragAndDrop } from '../../hooks/useDragAndDrop';
import { usePlannerStore, selectInboxItems, selectLaterItems, selectItemsForDay } from '../../store/usePlannerStore';
import { toDayKey } from '../../lib/dates';

export function AppShell() {
  const {
    activeItem,
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  } = useDragAndDrop();
  const view = usePlannerStore((s) => s.view);
  const setView = usePlannerStore((s) => s.setView);
  const toggleSidebar = usePlannerStore((s) => s.toggleSidebar);
  const expandedTaskId = usePlannerStore((s) => s.expandedTaskId);
  const showMoveModal = usePlannerStore((s) => s.showMoveModal);
  const showCommandPalette = usePlannerStore((s) => s.showCommandPalette);
  const showSettings = usePlannerStore((s) => s.showSettings);
  const clearSelection = usePlannerStore((s) => s.clearSelection);
  const setShowCommandPalette = usePlannerStore((s) => s.setShowCommandPalette);
  const lastKeyRef = useRef<{ key: string; time: number }>({ key: '', time: 0 });
  const [showFullConfetti, setShowFullConfetti] = useState(false);
  const dismissConfetti = useCallback(() => setShowFullConfetti(false), []);

  // Track today's completion — fire full-screen confetti when all of today's tasks are done
  const todayCompletedRef = useRef(false);
  const items = usePlannerStore((s) => s.items);
  useEffect(() => {
    const todayKey = toDayKey(new Date());
    let total = 0;
    let done = 0;
    for (const item of Object.values(items)) {
      if (item.type !== 'task' || item.parentId || item.dayKey !== todayKey) continue;
      total++;
      if (item.completed) done++;
    }

    if (total > 0 && done === total) {
      if (!todayCompletedRef.current) {
        todayCompletedRef.current = true;
        setShowFullConfetti(true);
      }
    } else {
      todayCompletedRef.current = false;
    }
  }, [items]);

  // Global "gi" → go to Inbox, "gl" → go to Later
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'g' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        lastKeyRef.current = { key: 'g', time: Date.now() };
        return;
      }

      const now = Date.now();
      if (lastKeyRef.current.key === 'g' && now - lastKeyRef.current.time < 500) {
        const store = usePlannerStore.getState();
        if (e.key === 'i') {
          e.preventDefault();
          lastKeyRef.current = { key: '', time: 0 };
          // Ensure sidebar is open and in timeline view
          if (store.view !== 'timeline') store.setView('timeline');
          if (store.sidebarCollapsed) store.toggleSidebar();
          // Select first inbox item
          const inboxItems = selectInboxItems(store.items);
          if (inboxItems.length > 0) store.startSelection(inboxItems[0].id);
          return;
        }
        if (e.key === 'l') {
          e.preventDefault();
          lastKeyRef.current = { key: '', time: 0 };
          if (store.view !== 'timeline') store.setView('timeline');
          if (store.sidebarCollapsed) store.toggleSidebar();
          if (!store.laterExpanded) store.setLaterExpanded(true);
          const laterItems = selectLaterItems(store.items);
          if (laterItems.length > 0) store.startSelection(laterItems[0].id);
          return;
        }
        if (e.key === 't') {
          e.preventDefault();
          lastKeyRef.current = { key: '', time: 0 };
          if (store.view !== 'timeline') store.setView('timeline');
          // Scroll to today column
          setTimeout(() => {
            document.getElementById('today-column')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 50);
          // Select first item of today
          const todayKey = toDayKey(new Date());
          const todayItems = selectItemsForDay(store.items, todayKey);
          if (todayItems.length > 0) store.startSelection(todayItems[0].id);
          return;
        }
      }

      lastKeyRef.current = { key: '', time: 0 };
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Global "t" key → toggle between Today and Timeline (unless editing or part of "gt" chord)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      // Skip if this "t" was part of a "gt" chord (handled above)
      if (lastKeyRef.current.key === 'g' && Date.now() - lastKeyRef.current.time < 500) return;
      if (e.key === 't' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setView(view === 'timeline' ? 'today' : 'timeline');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setView, view]);

  // Global "f" key → toggle sidebar (focus mode) when in timeline view
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (view !== 'timeline') return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'f' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [view, toggleSidebar]);

  // Cmd+K → toggle command palette (works even in inputs)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(!usePlannerStore.getState().showCommandPalette);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setShowCommandPalette]);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        className="flex flex-col h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)]"
        onMouseDown={(e) => {
          const target = e.target as HTMLElement;
          // Don't deselect if clicking on interactive elements or inside an item
          if (target.closest('button, input, textarea, [tabindex], [role="button"], .group')) return;
          clearSelection();
        }}
      >
        {/* Top bar */}
        <header className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setView('timeline')}
              className="text-2xl font-semibold tracking-[0.2em] text-blue-700 dark:text-blue-400 hover:opacity-80 transition-opacity"
            >
              zenmode
            </button>
          </div>
          <div className="flex items-center gap-1">
            {view === 'timeline' ? (
              <button
                onClick={() => setView('today')}
                title="Shortcut: T"
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                Today
                <kbd className="text-[10px] bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-1 py-0.5 text-[var(--color-text-muted)]">T</kbd>
              </button>
            ) : (
              <button
                onClick={() => setView('timeline')}
                title="Shortcut: T"
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                Timeline
                <kbd className="text-[10px] bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-1 py-0.5 text-[var(--color-text-muted)]">T</kbd>
              </button>
            )}
            <ThemeToggle />
            <ProfileMenu />
          </div>
        </header>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {view === 'today' ? (
            <TodayView />
          ) : view === 'hashtag' ? (
            <HashtagView />
          ) : (
            <>
              <Sidebar />
              <MainContent />
            </>
          )}
        </div>
      </div>

      {/* Expanded task modal */}
      {expandedTaskId && <ExpandedTaskView />}

      {/* Move-to-date modal */}
      {showMoveModal && <MoveModal />}

      {/* Command palette */}
      {showCommandPalette && <CommandPalette />}

      {/* Settings modal */}
      {showSettings && <SettingsView />}

      {/* Full-screen confetti for day completion */}
      {showFullConfetti && <FullScreenConfetti onDone={dismissConfetti} />}

      {/* Drag overlay — floating ghost copy */}
      <DragOverlay>
        {activeItem ? (
          <div className="opacity-90 shadow-xl rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] pointer-events-none">
            {activeItem.type === 'task' ? (
              <TaskItem item={activeItem} />
            ) : (
              <NoteItem item={activeItem} />
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
