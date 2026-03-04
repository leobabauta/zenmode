import { useEffect, useRef, useState, useCallback } from 'react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { Sidebar } from './Sidebar';
import { ZenmodeLogo } from './ZenmodeLogo';
import { MainContent } from './MainContent';
import { ThemeToggle } from '../ui/ThemeToggle';
import { SettingsView } from '../settings/SettingsView';
import { TodayView } from '../today/TodayView';
import { InboxView } from '../inbox/InboxView';
import { LaterView } from '../later/LaterView';
import { HashtagView } from '../hashtag/HashtagView';
import { TaskItem } from '../items/TaskItem';
import { NoteItem } from '../items/NoteItem';
import { ExpandedTaskView } from '../items/ExpandedTaskView';
import { MoveModal } from '../ui/MoveModal';
import { CommandPalette } from '../ui/CommandPalette';
import { FullScreenConfetti } from '../ui/FullScreenConfetti';
import { useDragAndDrop } from '../../hooks/useDragAndDrop';
import { usePlannerStore } from '../../store/usePlannerStore';
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
  const commandPaletteAddTask = usePlannerStore((s) => s.commandPaletteAddTask);
  const setCommandPaletteAddTask = usePlannerStore((s) => s.setCommandPaletteAddTask);
  const [showFullConfetti, setShowFullConfetti] = useState(false);
  const dismissConfetti = useCallback(() => setShowFullConfetti(false), []);

  // Track today's completion — fire full-screen confetti only when user checks off the last task
  const todayCompletedRef = useRef(false);
  const initialLoadRef = useRef(true);
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
        // Only fire confetti if this isn't the initial page load
        if (!initialLoadRef.current) {
          setShowFullConfetti(true);
        }
      }
    } else {
      todayCompletedRef.current = false;
    }
    initialLoadRef.current = false;
  }, [items]);

  // Global keyboard shortcuts: "i" → Inbox, "l" → Later, "t" → Today, "h" → Timeline (Home)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.shiftKey || e.metaKey || e.ctrlKey) return;

      if (e.key === 'i') {
        e.preventDefault();
        usePlannerStore.getState().setView('inbox');
        return;
      }
      if (e.key === 'l') {
        e.preventDefault();
        usePlannerStore.getState().setView('later');
        return;
      }
      if (e.key === 't') {
        e.preventDefault();
        usePlannerStore.getState().setView('today');
        return;
      }
      if (e.key === 'h') {
        e.preventDefault();
        usePlannerStore.getState().setView('timeline');
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

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

  // Global "n" key → open CommandPalette in add-task mode
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'n' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setCommandPaletteAddTask(true);
        setShowCommandPalette(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setShowCommandPalette]);

  // Cmd+K → toggle command palette (works even in inputs)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const current = usePlannerStore.getState().showCommandPalette;
        if (current) {
          setShowCommandPalette(false);
        } else {
          setCommandPaletteAddTask(false);
          setShowCommandPalette(true);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setShowCommandPalette]);

  const handleCloseCommandPalette = useCallback(() => {
    setShowCommandPalette(false);
    setCommandPaletteAddTask(false);
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
          if (target.closest('button, input, textarea, [tabindex], [role="button"], .group')) return;
          clearSelection();
        }}
      >
        {/* Top bar */}
        <header className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <ZenmodeLogo onClick={() => setView('timeline')} />
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
                title="Shortcut: H"
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                Timeline
                <kbd className="text-[10px] bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-1 py-0.5 text-[var(--color-text-muted)]">H</kbd>
              </button>
            )}
            <ThemeToggle />
          </div>
        </header>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {view === 'today' ? (
            <TodayView />
          ) : view === 'inbox' ? (
            <InboxView />
          ) : view === 'later' ? (
            <LaterView />
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
      {showCommandPalette && (
        <CommandPalette
          addTaskMode={commandPaletteAddTask}
          onClose={handleCloseCommandPalette}
        />
      )}

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
