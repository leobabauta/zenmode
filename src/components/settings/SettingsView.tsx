import { useState, useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { usePlannerStore, selectItemsForDay, selectInboxItems, selectLaterItems, selectChildItems } from '../../store/usePlannerStore';
import { requestCalendarAccess } from '../../lib/googleCalendar';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import type { PlannerItem } from '../../types';

const hasGoogleClientId = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

export function SettingsView() {
  const {
    items, setShowSettings, addItem,
    planningRitualEnabled, planningRitualHour,
    reviewRitualEnabled, reviewRitualHour,
    setPlanningRitualEnabled, setPlanningRitualHour,
    setReviewRitualEnabled, setReviewRitualHour,
    weeklyPlanningEnabled, weeklyPlanningDay, weeklyPlanningHour,
    weeklyReviewEnabled, weeklyReviewDay, weeklyReviewHour, weeklyReviewMinute,
    setWeeklyPlanningEnabled, setWeeklyPlanningDay, setWeeklyPlanningHour,
    setWeeklyReviewEnabled, setWeeklyReviewDay, setWeeklyReviewHour, setWeeklyReviewMinute,
    googleCalendarConnected, googleCalendarDismissed,
    setGoogleCalendarConnected, setGoogleCalendarDismissed,
  } = usePlannerStore(useShallow((s) => ({
    items: s.items,
    setShowSettings: s.setShowSettings,
    addItem: s.addItem,
    planningRitualEnabled: s.planningRitualEnabled,
    planningRitualHour: s.planningRitualHour,
    reviewRitualEnabled: s.reviewRitualEnabled,
    reviewRitualHour: s.reviewRitualHour,
    setPlanningRitualEnabled: s.setPlanningRitualEnabled,
    setPlanningRitualHour: s.setPlanningRitualHour,
    setReviewRitualEnabled: s.setReviewRitualEnabled,
    setReviewRitualHour: s.setReviewRitualHour,
    weeklyPlanningEnabled: s.weeklyPlanningEnabled,
    weeklyPlanningDay: s.weeklyPlanningDay,
    weeklyPlanningHour: s.weeklyPlanningHour,
    weeklyReviewEnabled: s.weeklyReviewEnabled,
    weeklyReviewDay: s.weeklyReviewDay,
    weeklyReviewHour: s.weeklyReviewHour,
    weeklyReviewMinute: s.weeklyReviewMinute,
    setWeeklyPlanningEnabled: s.setWeeklyPlanningEnabled,
    setWeeklyPlanningDay: s.setWeeklyPlanningDay,
    setWeeklyPlanningHour: s.setWeeklyPlanningHour,
    setWeeklyReviewEnabled: s.setWeeklyReviewEnabled,
    setWeeklyReviewDay: s.setWeeklyReviewDay,
    setWeeklyReviewHour: s.setWeeklyReviewHour,
    setWeeklyReviewMinute: s.setWeeklyReviewMinute,
    googleCalendarConnected: s.googleCalendarConnected,
    googleCalendarDismissed: s.googleCalendarDismissed,
    setGoogleCalendarConnected: s.setGoogleCalendarConnected,
    setGoogleCalendarDismissed: s.setGoogleCalendarDismissed,
  })));

  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const user = useAuthStore((s) => s.user);

  const [calConnecting, setCalConnecting] = useState(false);
  const [calError, setCalError] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleLogout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    usePlannerStore.persist.clearStorage();
    window.location.reload();
  };

  const handleDeleteAccount = async () => {
    if (!supabase || !user) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      // Delete all user items
      const { error: itemsErr } = await supabase.from('items').delete().eq('user_id', user.id);
      if (itemsErr) throw itemsErr;
      // Delete user preferences
      const { error: prefsErr } = await supabase.from('user_preferences').delete().eq('user_id', user.id);
      if (prefsErr) throw prefsErr;
      // Delete auth account via Edge Function
      const { error: deleteErr } = await supabase.functions.invoke('delete-user');
      if (deleteErr) throw deleteErr;
      // Clear local storage and sign out
      usePlannerStore.persist.clearStorage();
      await supabase.auth.signOut();
      window.location.reload();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete account');
      setDeleteLoading(false);
    }
  };

  const handleConnectCalendar = async () => {
    setCalConnecting(true);
    setCalError(null);
    try {
      await requestCalendarAccess();
      setGoogleCalendarConnected(true);
      if (googleCalendarDismissed) setGoogleCalendarDismissed(false);
    } catch (err) {
      setCalError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setCalConnecting(false);
    }
  };

  const handleDisconnectCalendar = () => {
    setGoogleCalendarConnected(false);
  };

  const [importPreview, setImportPreview] = useState<{ dayKey: string | null; isLater: boolean; type: 'task' | 'note'; text: string; completed: boolean }[] | null>(null);
  const [importDone, setImportDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowSettings(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setShowSettings]);

  const handleExport = () => {
    const allItems = Object.values(items).filter((i) => !i.parentId);

    // Group by dayKey
    const dayKeys = new Set<string>();
    const inboxItems: PlannerItem[] = [];
    const laterItems: PlannerItem[] = [];

    for (const item of allItems) {
      if (item.dayKey) {
        dayKeys.add(item.dayKey);
      } else if (item.isLater) {
        laterItems.push(item);
      } else {
        inboxItems.push(item);
      }
    }

    const sortedDays = Array.from(dayKeys).sort((a, b) => a.localeCompare(b));
    const lines: string[] = [];

    const pushItem = (item: PlannerItem, indent: string = '') => {
      if (item.type === 'task') {
        lines.push(indent + (item.completed ? `- [x] ${item.text}` : `- ${item.text}`));
      } else {
        lines.push(indent + item.text);
      }
      // Export child items (task focus sub-items) with extra indent
      const children = selectChildItems(items, item.id);
      for (const child of children) {
        pushItem(child, indent + '    ');
      }
    };

    for (const dk of sortedDays) {
      const dayItems = selectItemsForDay(items, dk);
      lines.push(`# ${dk}`);
      for (const item of dayItems) {
        pushItem(item);
      }
      lines.push('');
    }

    if (inboxItems.length > 0) {
      const sorted = selectInboxItems(items);
      lines.push('# Inbox');
      for (const item of sorted) {
        pushItem(item);
      }
      lines.push('');
    }

    if (laterItems.length > 0) {
      const sorted = selectLaterItems(items);
      lines.push('# Later');
      for (const item of sorted) {
        pushItem(item);
      }
      lines.push('');
    }

    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}.${pad(now.getMinutes())}`;
    a.download = `zenmode-export ${timestamp}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const parsed = parseMarkdown(text);
      setImportPreview(parsed);
      setImportDone(false);
    };
    reader.readAsText(file);
    // Reset input so the same file can be re-selected
    e.target.value = '';
  };

  const handleConfirmImport = () => {
    if (!importPreview) return;
    for (const entry of importPreview) {
      addItem({
        type: entry.type,
        text: entry.text,
        dayKey: entry.dayKey,
        isLater: entry.isLater,
      });
      // If it was completed, mark it after adding
      // addItem creates uncompleted items, so we'd need to update after.
      // For simplicity, we'll handle completed in a second pass.
    }
    // Second pass: mark completed items
    // We can't easily do this since addItem doesn't return the ID.
    // Instead, let's just import them as-is (uncompleted). Completed tasks
    // are exported for reference but imported as uncompleted.
    setImportDone(true);
    setImportPreview(null);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setShowSettings(false)} />
      <div className="fixed left-1/2 top-[15%] -translate-x-1/2 w-[440px] max-h-[70vh] z-50 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Settings</h2>
          <button
            onClick={() => setShowSettings(false)}
            className="p-1 rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-5 space-y-6">
          {/* Rituals section */}
          <div>
            <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">Rituals</h3>

            {/* Planning ritual */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1">
                <p className="text-sm text-[var(--color-text-primary)]">Daily Planning Ritual</p>
                <p className="text-xs text-[var(--color-text-muted)]">Morning planning prompt</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={planningRitualHour}
                  onChange={(e) => setPlanningRitualHour(Number(e.target.value))}
                  disabled={!planningRitualEnabled}
                  className="text-xs px-2 py-1 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] disabled:opacity-40"
                >
                  {Array.from({ length: 8 }, (_, i) => i + 5).map((h) => (
                    <option key={h} value={h}>{h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`}</option>
                  ))}
                </select>
                <button
                  onClick={() => setPlanningRitualEnabled(!planningRitualEnabled)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${planningRitualEnabled ? 'bg-blue-500' : 'bg-[var(--color-border)]'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${planningRitualEnabled ? 'translate-x-4' : ''}`} />
                </button>
              </div>
            </div>

            {/* Review ritual */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1">
                <p className="text-sm text-[var(--color-text-primary)]">Daily Review Ritual</p>
                <p className="text-xs text-[var(--color-text-muted)]">Evening reflection prompt</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={reviewRitualHour}
                  onChange={(e) => setReviewRitualHour(Number(e.target.value))}
                  disabled={!reviewRitualEnabled}
                  className="text-xs px-2 py-1 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] disabled:opacity-40"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 12).map((h) => (
                    <option key={h} value={h}>{h === 12 ? '12 PM' : `${h - 12} PM`}</option>
                  ))}
                </select>
                <button
                  onClick={() => setReviewRitualEnabled(!reviewRitualEnabled)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${reviewRitualEnabled ? 'bg-blue-500' : 'bg-[var(--color-border)]'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${reviewRitualEnabled ? 'translate-x-4' : ''}`} />
                </button>
              </div>
            </div>

            {/* Weekly Planning ritual */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1">
                <p className="text-sm text-[var(--color-text-primary)]">Weekly Planning Ritual</p>
                <p className="text-xs text-[var(--color-text-muted)]">Weekly planning prompt</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={weeklyPlanningDay}
                  onChange={(e) => setWeeklyPlanningDay(Number(e.target.value))}
                  disabled={!weeklyPlanningEnabled}
                  className="text-xs px-2 py-1 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] disabled:opacity-40"
                >
                  {DAY_NAMES.map((name, i) => (
                    <option key={i} value={i}>{name}</option>
                  ))}
                </select>
                <select
                  value={weeklyPlanningHour}
                  onChange={(e) => setWeeklyPlanningHour(Number(e.target.value))}
                  disabled={!weeklyPlanningEnabled}
                  className="text-xs px-2 py-1 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] disabled:opacity-40"
                >
                  {Array.from({ length: 8 }, (_, i) => i + 5).map((h) => (
                    <option key={h} value={h}>{h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`}</option>
                  ))}
                </select>
                <button
                  onClick={() => setWeeklyPlanningEnabled(!weeklyPlanningEnabled)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${weeklyPlanningEnabled ? 'bg-blue-500' : 'bg-[var(--color-border)]'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${weeklyPlanningEnabled ? 'translate-x-4' : ''}`} />
                </button>
              </div>
            </div>

            {/* Weekly Review ritual */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-[var(--color-text-primary)]">Weekly Review Ritual</p>
                <p className="text-xs text-[var(--color-text-muted)]">End of week reflection</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={weeklyReviewDay}
                  onChange={(e) => setWeeklyReviewDay(Number(e.target.value))}
                  disabled={!weeklyReviewEnabled}
                  className="text-xs px-2 py-1 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] disabled:opacity-40"
                >
                  {DAY_NAMES.map((name, i) => (
                    <option key={i} value={i}>{name}</option>
                  ))}
                </select>
                <select
                  value={`${weeklyReviewHour}:${weeklyReviewMinute}`}
                  onChange={(e) => {
                    const [h, m] = e.target.value.split(':').map(Number);
                    setWeeklyReviewHour(h);
                    setWeeklyReviewMinute(m);
                  }}
                  disabled={!weeklyReviewEnabled}
                  className="text-xs px-2 py-1 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] disabled:opacity-40"
                >
                  {Array.from({ length: 24 }, (_, i) => {
                    const h = Math.floor(i / 2) + 12;
                    const m = (i % 2) * 30;
                    if (h > 23) return null;
                    const label = `${h === 12 ? 12 : h > 12 ? h - 12 : h}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
                    return <option key={`${h}:${m}`} value={`${h}:${m}`}>{label}</option>;
                  })}
                </select>
                <button
                  onClick={() => setWeeklyReviewEnabled(!weeklyReviewEnabled)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${weeklyReviewEnabled ? 'bg-blue-500' : 'bg-[var(--color-border)]'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${weeklyReviewEnabled ? 'translate-x-4' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Google Calendar section */}
          {hasGoogleClientId && (
            <div>
              <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">Google Calendar</h3>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-[var(--color-text-primary)]">
                    {googleCalendarConnected ? 'Connected' : 'Not connected'}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Import calendar events during daily planning
                  </p>
                </div>
                <div>
                  {googleCalendarConnected ? (
                    <button
                      onClick={handleDisconnectCalendar}
                      className="px-3 py-1.5 text-sm rounded-md border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      onClick={handleConnectCalendar}
                      disabled={calConnecting}
                      className="px-3 py-1.5 text-sm rounded-md bg-[var(--color-accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-60"
                    >
                      {calConnecting ? 'Connecting...' : 'Connect'}
                    </button>
                  )}
                </div>
              </div>
              {calError && (
                <p className="mt-2 text-xs text-red-500">{calError}</p>
              )}
            </div>
          )}

          {/* Export section */}
          <div>
            <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-2">Export</h3>
            <p className="text-xs text-[var(--color-text-muted)] mb-3">
              Download all your tasks and notes as a Markdown file.
            </p>
            <button
              onClick={handleExport}
              className="px-3 py-1.5 text-sm rounded-md bg-[var(--color-accent)] text-white hover:opacity-90 transition-opacity"
            >
              Export as Markdown
            </button>
          </div>

          {/* Import section */}
          <div>
            <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-2">Import</h3>
            <p className="text-xs text-[var(--color-text-muted)] mb-3">
              Import tasks and notes from a Markdown file. Items are merged with existing data.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".md,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 text-sm rounded-md border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors"
            >
              Choose file
            </button>

            {importPreview && (
              <div className="mt-3 p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
                <p className="text-sm text-[var(--color-text-primary)] mb-2">
                  Found <strong>{importPreview.length}</strong> items to import:
                </p>
                <ul className="text-xs text-[var(--color-text-secondary)] space-y-0.5 max-h-32 overflow-y-auto mb-3">
                  {importPreview.slice(0, 10).map((entry, i) => (
                    <li key={i}>
                      {entry.type === 'task' ? '- ' : ''}{entry.text.slice(0, 60)}{entry.text.length > 60 ? '...' : ''}
                      <span className="text-[var(--color-text-muted)]"> ({entry.dayKey ?? (entry.isLater ? 'Later' : 'Inbox')})</span>
                    </li>
                  ))}
                  {importPreview.length > 10 && (
                    <li className="text-[var(--color-text-muted)]">...and {importPreview.length - 10} more</li>
                  )}
                </ul>
                <div className="flex gap-2">
                  <button
                    onClick={handleConfirmImport}
                    className="px-3 py-1.5 text-sm rounded-md bg-[var(--color-accent)] text-white hover:opacity-90 transition-opacity"
                  >
                    Confirm import
                  </button>
                  <button
                    onClick={() => setImportPreview(null)}
                    className="px-3 py-1.5 text-sm rounded-md border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {importDone && (
              <p className="mt-2 text-xs text-green-600 dark:text-green-400">Import complete!</p>
            )}
          </div>

          {/* Changelog link */}
          <div>
            <a
              href="/changelog.html"
              className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Changelog & Roadmap
            </a>
          </div>

          {/* Account section */}
          {supabase && user && (
            <div>
              <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">Account</h3>
              <AccountName user={user} />
              <p className="text-xs text-[var(--color-text-muted)] mb-3">{user.email}</p>

              <div className="flex flex-col gap-2">
                {/* Log out */}
                {!showLogoutConfirm ? (
                  <button
                    onClick={() => setShowLogoutConfirm(true)}
                    className="w-fit px-3 py-1.5 text-sm rounded-md border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors"
                  >
                    Log out
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[var(--color-text-secondary)]">Log out?</span>
                    <button
                      onClick={handleLogout}
                      className="px-3 py-1.5 text-sm rounded-md bg-stone-700 text-white hover:bg-stone-800 transition-colors"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setShowLogoutConfirm(false)}
                      className="px-3 py-1.5 text-sm rounded-md border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* Delete account */}
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-fit px-3 py-1.5 text-sm rounded-md border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                  >
                    Delete account
                  </button>
                ) : (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800">
                    <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">Are you sure?</p>
                    <p className="text-xs text-red-600 dark:text-red-400/80 mb-3">
                      This will permanently delete your account and all your data (tasks, notes, and preferences). This action cannot be undone.
                    </p>
                    {deleteError && (
                      <p className="text-xs text-red-600 mb-2">{deleteError}</p>
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleDeleteAccount}
                        disabled={deleteLoading}
                        className="px-3 py-1.5 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {deleteLoading ? 'Deleting...' : 'Yes, delete everything'}
                      </button>
                      <button
                        onClick={() => { setShowDeleteConfirm(false); setDeleteError(null); }}
                        disabled={deleteLoading}
                        className="px-3 py-1.5 text-sm rounded-md border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function AccountName({ user }: { user: { id: string; user_metadata?: { full_name?: string } } }) {
  const name = user.user_metadata?.full_name || '';
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) setTimeout(() => inputRef.current?.focus(), 0);
  }, [editing]);

  const save = async () => {
    const trimmed = value.trim();
    setEditing(false);
    if (trimmed === name) return;
    if (!supabase) return;
    await supabase.auth.updateUser({ data: { full_name: trimmed } });
    // Update the local auth store
    useAuthStore.setState((s) => {
      if (s.user) {
        return { user: { ...s.user, user_metadata: { ...s.user.user_metadata, full_name: trimmed } } };
      }
      return s;
    });
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save();
          if (e.key === 'Escape') { setValue(name); setEditing(false); }
        }}
        onBlur={save}
        placeholder="Your name"
        className="text-sm font-medium text-[var(--color-text-primary)] bg-transparent border-b border-[var(--color-border)] outline-none mb-1 w-full"
      />
    );
  }

  return (
    <button
      onClick={() => { setValue(name); setEditing(true); }}
      className="text-sm font-medium text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition-colors mb-1 flex items-center gap-1"
      title="Click to edit name"
    >
      {name || 'Add your name'}
      <svg className="w-3 h-3 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    </button>
  );
}

function parseMarkdown(text: string): { dayKey: string | null; isLater: boolean; type: 'task' | 'note'; text: string; completed: boolean }[] {
  const results: { dayKey: string | null; isLater: boolean; type: 'task' | 'note'; text: string; completed: boolean }[] = [];
  const lines = text.split('\n');

  let currentDayKey: string | null = null;
  let currentIsLater = false;
  const dateRegex = /^#\s+(\d{4}-\d{2}-\d{2})\s*$/;
  const inboxRegex = /^#\s+Inbox\s*$/i;
  const laterRegex = /^#\s+Later\s*$/i;
  const taskRegex = /^-\s+(.+)$/;
  const completedRegex = /^-\s+\[x\]\s+(.+)$/i;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check for headers
    const dateMatch = trimmed.match(dateRegex);
    if (dateMatch) {
      currentDayKey = dateMatch[1];
      currentIsLater = false;
      continue;
    }
    if (inboxRegex.test(trimmed)) {
      currentDayKey = null;
      currentIsLater = false;
      continue;
    }
    if (laterRegex.test(trimmed)) {
      currentDayKey = null;
      currentIsLater = true;
      continue;
    }

    // Check for completed task
    const completedMatch = trimmed.match(completedRegex);
    if (completedMatch) {
      results.push({
        dayKey: currentDayKey,
        isLater: currentIsLater,
        type: 'task',
        text: completedMatch[1].trim(),
        completed: true,
      });
      continue;
    }

    // Check for task
    const taskMatch = trimmed.match(taskRegex);
    if (taskMatch) {
      results.push({
        dayKey: currentDayKey,
        isLater: currentIsLater,
        type: 'task',
        text: taskMatch[1].trim(),
        completed: false,
      });
      continue;
    }

    // Otherwise it's a note
    results.push({
      dayKey: currentDayKey,
      isLater: currentIsLater,
      type: 'note',
      text: trimmed,
      completed: false,
    });
  }

  return results;
}
