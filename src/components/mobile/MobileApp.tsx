import { useState, useRef } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';
import { toDayKey } from '../../lib/dates';
import { MobileBottomNav, type MobileTab } from './MobileBottomNav';
import { MobileTodayView } from './MobileTodayView';
import { MobileTimelineView } from './MobileTimelineView';
import { MobileInboxView } from './MobileInboxView';
import { MobileListsView } from './MobileListsView';
import { MobileAddButton } from './MobileAddButton';
import { DeleteRecurrenceModal } from '../ui/DeleteRecurrenceModal';

export function MobileApp() {
  const [activeTab, setActiveTab] = useState<MobileTab>('today');
  const [showSettings, setShowSettings] = useState(false);
  const [showAddInput, setShowAddInput] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);
  const [addText, setAddText] = useState('');

  const theme = usePlannerStore((s) => s.theme);
  const toggleTheme = usePlannerStore((s) => s.toggleTheme);
  const addItem = usePlannerStore((s) => s.addItem);
  const getDayKeyForTab = (): string | null => {
    switch (activeTab) {
      case 'today': return toDayKey(new Date());
      case 'inbox': return null;
      default: return toDayKey(new Date());
    }
  };

  const handleAdd = () => {
    setShowAddInput(true);
    setTimeout(() => addInputRef.current?.focus(), 50);
  };

  const submitAdd = () => {
    const trimmed = addText.trim();
    if (trimmed) {
      addItem({ type: 'task', text: trimmed, dayKey: getDayKeyForTab() });
    }
    setAddText('');
    setShowAddInput(false);
  };

  const renderView = () => {
    switch (activeTab) {
      case 'today': return <MobileTodayView />;
      case 'timeline': return <MobileTimelineView />;
      case 'inbox': return <MobileInboxView />;
      case 'lists': return <MobileListsView />;
    }
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-[var(--color-bg)]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-[env(safe-area-inset-top)] h-[44px] flex-shrink-0">
        <span className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
          Zen
        </span>
        <div className="relative">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-[var(--color-text-muted)]"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </button>

          {showSettings && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowSettings(false)} />
              <div className="absolute right-0 top-full mt-1 w-48 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg shadow-lg z-50 py-1">
                <button
                  onClick={() => {
                    toggleTheme();
                    setShowSettings(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]"
                >
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Inline add input (slides down from top when FAB pressed) */}
      {showAddInput && (
        <div className="px-5 py-3 border-b border-[var(--color-border)]">
          <input
            ref={addInputRef}
            value={addText}
            onChange={(e) => setAddText(e.target.value)}
            onBlur={submitAdd}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); submitAdd(); }
              if (e.key === 'Escape') { setAddText(''); setShowAddInput(false); }
            }}
            placeholder="New task..."
            className="w-full bg-transparent text-base text-[var(--color-text-primary)] outline-none"
          />
        </div>
      )}

      {/* Content */}
      {renderView()}

      {/* FAB */}
      <MobileAddButton onClick={handleAdd} />

      {/* Bottom nav */}
      <MobileBottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Delete recurrence modal */}
      <DeleteRecurrenceModal />
    </div>
  );
}
