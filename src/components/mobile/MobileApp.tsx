import { useState, useRef } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';
import { supabase } from '../../lib/supabase';
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
  const [showMenu, setShowMenu] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const quickAddRef = useRef<HTMLInputElement>(null);
  const [addText, setAddText] = useState('');
  const [addTarget, setAddTarget] = useState<'inbox' | 'today'>('inbox');

  const theme = usePlannerStore((s) => s.theme);
  const toggleTheme = usePlannerStore((s) => s.toggleTheme);
  const addItem = usePlannerStore((s) => s.addItem);

  const handleAdd = () => {
    setAddText('');
    setAddTarget('inbox');
    setShowQuickAdd(true);
    setTimeout(() => quickAddRef.current?.focus(), 50);
  };

  const submitAdd = () => {
    const trimmed = addText.trim();
    if (trimmed) {
      addItem({
        type: 'task',
        text: trimmed,
        dayKey: addTarget === 'today' ? toDayKey(new Date()) : null,
      });
    }
    setAddText('');
    setShowQuickAdd(false);
  };

  const handleLogout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    usePlannerStore.persist.clearStorage();
    window.location.reload();
  };

  const renderView = () => {
    switch (activeTab) {
      case 'today': return <MobileTodayView />;
      case 'timeline': return <MobileTimelineView />;
      case 'inbox': return <MobileInboxView />;
      case 'lists': return <MobileListsView />;
    }
  };

  // Quick add full-screen overlay
  if (showQuickAdd) {
    return (
      <div className="h-[100dvh] flex flex-col bg-[var(--color-bg)]">
        <div className="flex items-center justify-between px-5 pt-[env(safe-area-inset-top)] h-[44px] flex-shrink-0">
          <button
            onClick={() => setShowQuickAdd(false)}
            className="text-sm text-[var(--color-text-muted)]"
          >
            Cancel
          </button>
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">Quick add task</span>
          <button
            onClick={submitAdd}
            className="text-sm font-semibold text-[var(--color-accent)]"
          >
            Add
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <input
            ref={quickAddRef}
            value={addText}
            onChange={(e) => setAddText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); submitAdd(); }
              if (e.key === 'Escape') setShowQuickAdd(false);
            }}
            placeholder="What needs to be done?"
            className="w-full bg-transparent text-lg text-center text-[var(--color-text-primary)] outline-none border-b border-[var(--color-border)] pb-3"
          />
          <div className="flex items-center gap-3 mt-5">
            <button
              onClick={() => setAddTarget('inbox')}
              className={`px-4 py-1.5 text-sm rounded-full transition-colors ${
                addTarget === 'inbox'
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'border border-[var(--color-border)] text-[var(--color-text-secondary)]'
              }`}
            >
              Inbox
            </button>
            <button
              onClick={() => setAddTarget('today')}
              className={`px-4 py-1.5 text-sm rounded-full transition-colors ${
                addTarget === 'today'
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'border border-[var(--color-border)] text-[var(--color-text-secondary)]'
              }`}
            >
              Today
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Settings full-screen view
  if (showSettings) {
    return (
      <div className="h-[100dvh] flex flex-col bg-[var(--color-bg)]">
        <div className="flex items-center justify-between px-5 pt-[env(safe-area-inset-top)] h-[44px] flex-shrink-0">
          <button
            onClick={() => { setShowSettings(false); setShowLogoutConfirm(false); }}
            className="text-[var(--color-text-muted)] p-1"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">Settings</span>
          <div className="w-5" />
        </div>

        <div className="flex-1 overflow-y-auto px-5 pt-6 space-y-6">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between py-3 text-[var(--color-text-primary)]"
          >
            <span className="text-base">Appearance</span>
            <span className="text-sm text-[var(--color-text-muted)]">{theme === 'dark' ? 'Dark' : 'Light'}</span>
          </button>

          <div className="border-t border-[var(--color-border)]" />

          {/* Log out */}
          {supabase && !showLogoutConfirm && (
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full text-left py-3 text-base text-[var(--color-text-primary)]"
            >
              Log out
            </button>
          )}

          {showLogoutConfirm && (
            <div className="py-3">
              <p className="text-sm text-[var(--color-text-secondary)] mb-3">Are you sure you want to log out?</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm rounded-lg bg-stone-700 text-white"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="px-4 py-2 text-sm rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-[var(--color-bg)]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-[env(safe-area-inset-top)] h-[44px] flex-shrink-0">
        <span className="text-sm font-semibold text-[var(--color-text-muted)] tracking-wide">
          zenmode
        </span>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-[var(--color-text-muted)]"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-48 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg shadow-lg z-50 py-1">
                <button
                  onClick={() => {
                    toggleTheme();
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]"
                >
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowSettings(true);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]"
                >
                  Settings
                </button>
              </div>
            </>
          )}
        </div>
      </div>

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
