import { useEffect, useRef, useState, useCallback } from 'react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { Sidebar } from './Sidebar';
import { MainContent } from './MainContent';
import { ThemeToggle } from '../ui/ThemeToggle';
import { SettingsView } from '../settings/SettingsView';
import { TodayView } from '../today/TodayView';
import { InboxView } from '../inbox/InboxView';
import { LaterView } from '../later/LaterView';
import { HashtagView } from '../hashtag/HashtagView';
import { CustomListView } from '../lists/CustomListView';
import { ArchiveView } from '../archive/ArchiveView';
import { StatsView } from '../stats/StatsView';
import { TaskItem } from '../items/TaskItem';
import { NoteItem } from '../items/NoteItem';
import { ExpandedTaskView } from '../items/ExpandedTaskView';
import { MoveModal } from '../ui/MoveModal';
import { CommandPalette } from '../ui/CommandPalette';
import { FullScreenConfetti } from '../ui/FullScreenConfetti';
import { DeleteRecurrenceModal } from '../ui/DeleteRecurrenceModal';
import { QuickCaptureBar } from '../forms/QuickCaptureBar';
import { RitualPrompt } from '../ritual/RitualPrompt';
import { DailyRitualView } from '../ritual/DailyRitualView';
import { ReviewRitualPrompt } from '../ritual/ReviewRitualPrompt';
import { DailyReviewView } from '../ritual/DailyReviewView';
import { WeeklyPlanningPrompt } from '../ritual/WeeklyPlanningPrompt';
import { WeeklyReviewPrompt } from '../ritual/WeeklyReviewPrompt';
import { WeeklyPlanningView } from '../ritual/WeeklyPlanningView';
import { WeeklyReviewView } from '../ritual/WeeklyReviewView';
import { WeekPlanPage } from '../ritual/WeekPlanPage';
import { WeekReviewPage } from '../ritual/WeekReviewPage';
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
  const showRitualPrompt = usePlannerStore((s) => s.showRitualPrompt);
  const showReviewRitualPrompt = usePlannerStore((s) => s.showReviewRitualPrompt);
  const showWeeklyPlanningPrompt = usePlannerStore((s) => s.showWeeklyPlanningPrompt);
  const showWeeklyReviewPrompt = usePlannerStore((s) => s.showWeeklyReviewPrompt);
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

      if (e.key === '?' && e.shiftKey) {
        e.preventDefault();
        usePlannerStore.getState().setShowShortcuts(true);
        return;
      }

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
      if (e.key === 's') {
        e.preventDefault();
        usePlannerStore.getState().setView('stats');
        return;
      }
      if (e.key === 'a') {
        e.preventDefault();
        usePlannerStore.getState().setView('archive');
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Views that show the sidebar
  const sidebarViews = ['timeline', 'today', 'inbox', 'later', 'hashtag', 'list', 'stats', 'weekPlan', 'weekReviewPage', 'archive'];

  // Global "f" key → toggle sidebar (focus mode) in views that have sidebar
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!sidebarViews.includes(view)) return;
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
        className="flex h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)]"
        onMouseDown={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('button, input, textarea, [tabindex], [role="button"], .group')) return;
          clearSelection();
        }}
      >
        {view === 'ritual' ? (
          <DailyRitualView />
        ) : view === 'review' ? (
          <DailyReviewView />
        ) : view === 'weeklyPlanning' ? (
          <WeeklyPlanningView />
        ) : view === 'weeklyReview' ? (
          <WeeklyReviewView />
        ) : (
          <>
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden relative">
              {/* Floating top-right controls */}
              <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
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

              {view === 'today' ? (
                <TodayView />
              ) : view === 'inbox' ? (
                <InboxView />
              ) : view === 'later' ? (
                <LaterView />
              ) : view === 'hashtag' ? (
                <HashtagView />
              ) : view === 'list' ? (
                <CustomListView />
              ) : view === 'archive' ? (
                <ArchiveView />
              ) : view === 'stats' ? (
                <StatsView />
              ) : view === 'weekPlan' ? (
                <WeekPlanPage />
              ) : view === 'weekReviewPage' ? (
                <WeekReviewPage />
              ) : (
                <MainContent />
              )}
            </div>
          </>
        )}
      </div>

      {/* Ritual prompt overlays */}
      {showRitualPrompt && <RitualPrompt />}
      {showReviewRitualPrompt && <ReviewRitualPrompt />}
      {showWeeklyPlanningPrompt && <WeeklyPlanningPrompt />}
      {showWeeklyReviewPrompt && <WeeklyReviewPrompt />}

      {/* Quick capture bar — visible in all views */}
      <QuickCaptureBar />

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

      {/* Delete recurrence confirmation modal */}
      <DeleteRecurrenceModal />

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
