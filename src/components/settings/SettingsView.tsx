import { useState, useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { usePlannerStore, selectItemsForDay, selectInboxItems, selectLaterItems, selectChildItems } from '../../store/usePlannerStore';
import { requestCalendarAccess, clearCalendarToken } from '../../lib/googleCalendar';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { cn } from '../../lib/utils';
import { COLOR_PRESETS } from '../../lib/colorThemes';
import type { PlannerItem } from '../../types';

const hasGoogleClientId = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

type SettingsTab = 'profile' | 'features' | 'data';

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
    accentColor, setAccentColor,
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
    accentColor: s.accentColor,
    setAccentColor: s.setAccentColor,
    googleCalendarConnected: s.googleCalendarConnected,
    googleCalendarDismissed: s.googleCalendarDismissed,
    setGoogleCalendarConnected: s.setGoogleCalendarConnected,
    setGoogleCalendarDismissed: s.setGoogleCalendarDismissed,
  })));

  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<SettingsTab>('profile');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [calConnecting, setCalConnecting] = useState(false);
  const [calError, setCalError] = useState<string | null>(null);
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
      const { error: itemsErr } = await supabase.from('items').delete().eq('user_id', user.id);
      if (itemsErr) throw itemsErr;
      const { error: prefsErr } = await supabase.from('user_preferences').delete().eq('user_id', user.id);
      if (prefsErr) throw prefsErr;
      const { error: deleteErr } = await supabase.functions.invoke('delete-user');
      if (deleteErr) throw deleteErr;
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
    clearCalendarToken();
    setGoogleCalendarConnected(false);
  };

  const handleExport = () => {
    const allItems = Object.values(items).filter((i) => !i.parentId);
    const dayKeys = new Set<string>();
    const inboxItems: PlannerItem[] = [];
    const laterItems: PlannerItem[] = [];
    for (const item of allItems) {
      if (item.dayKey) dayKeys.add(item.dayKey);
      else if (item.isLater) laterItems.push(item);
      else inboxItems.push(item);
    }
    const sortedDays = Array.from(dayKeys).sort((a, b) => a.localeCompare(b));
    const lines: string[] = [];
    const pushItem = (item: PlannerItem, indent: string = '') => {
      if (item.type === 'task') {
        lines.push(indent + (item.completed ? `- [x] ${item.text}` : `- ${item.text}`));
      } else {
        lines.push(indent + item.text);
      }
      const children = selectChildItems(items, item.id);
      for (const child of children) pushItem(child, indent + '    ');
    };
    for (const dk of sortedDays) {
      lines.push(`# ${dk}`);
      for (const item of selectItemsForDay(items, dk)) pushItem(item);
      lines.push('');
    }
    if (inboxItems.length > 0) {
      lines.push('# Inbox');
      for (const item of selectInboxItems(items)) pushItem(item);
      lines.push('');
    }
    if (laterItems.length > 0) {
      lines.push('# Later');
      for (const item of selectLaterItems(items)) pushItem(item);
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
      setImportPreview(parseMarkdown(text));
      setImportDone(false);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmImport = () => {
    if (!importPreview) return;
    for (const entry of importPreview) {
      addItem({ type: entry.type, text: entry.text, dayKey: entry.dayKey, isLater: entry.isLater });
    }
    setImportDone(true);
    setImportPreview(null);
  };

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'features', label: 'Features' },
    { id: 'data', label: 'Data' },
  ];

  const avatarUrl = user?.user_metadata?.avatar_url;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-8">
          {/* Top bar: close + sign out */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setShowSettings(false)}
              className="-ml-40 w-8 h-8 flex items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors"
              title="Close settings"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          <div className="flex items-center gap-2">
            {!showLogoutConfirm ? (
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="px-4 py-1.5 text-sm rounded-full border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors"
              >
                Sign out
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--color-text-secondary)]">Sign out?</span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-sm rounded-full bg-stone-700 text-white hover:bg-stone-800 transition-colors"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="px-3 py-1.5 text-sm rounded-full border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
          </div>

          {/* Title */}
          <h1 className="text-5xl font-bold dark:font-extrabold text-[var(--color-text-primary)] mb-6">Settings</h1>

          {/* Tabs */}
          <div className="flex gap-2 mb-8">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'px-4 py-1.5 text-sm rounded-full border transition-colors',
                  tab === t.id
                    ? 'border-[var(--color-text-primary)] text-[var(--color-text-primary)] font-medium'
                    : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Profile tab */}
          {tab === 'profile' && (
            <div className="space-y-6">
              {/* Personal info card */}
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-settings)] p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-base font-bold text-[var(--color-text-primary)]">Personal info</h2>
                    <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Update your photo and personal details here</p>
                  </div>
                  {avatarUrl && (
                    <img
                      src={avatarUrl}
                      alt=""
                      className="w-14 h-14 rounded-full object-cover border-2 border-[var(--color-border)]"
                    />
                  )}
                </div>

                <NameFields user={user} />

                <div className="mt-4">
                  <label className="text-sm text-[var(--color-text-secondary)] mb-1.5 block">Primary email</label>
                  <div className="px-4 py-2.5 rounded-xl bg-[var(--color-input-settings)] text-sm text-[var(--color-text-muted)]">
                    {user?.email || ''}
                  </div>
                </div>
              </div>

              {/* Export card */}
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-settings)] p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-[var(--color-text-primary)]">Export account data</h2>
                  <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Download a .md file with your account data</p>
                </div>
                <button
                  onClick={handleExport}
                  className="px-4 py-1.5 text-sm rounded-full border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg)] transition-colors flex-shrink-0"
                >
                  Download
                </button>
              </div>

              {/* Delete account card */}
              {supabase && user && (
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-settings)] p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-[var(--color-text-primary)]">Account deletion</h2>
                      <p className="text-sm text-[var(--color-text-muted)] mt-0.5">This action is permanent and cannot be undone</p>
                    </div>
                    {!showDeleteConfirm && (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="px-4 py-1.5 text-sm rounded-full border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors flex-shrink-0"
                      >
                        Delete account
                      </button>
                    )}
                  </div>
                  {showDeleteConfirm && (
                    <div className="mt-4 p-4 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800">
                      <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">Are you sure?</p>
                      <p className="text-xs text-red-600 dark:text-red-400/80 mb-3">
                        This will permanently delete your account and all your data (tasks, notes, and preferences). This action cannot be undone.
                      </p>
                      {deleteError && <p className="text-xs text-red-600 mb-2">{deleteError}</p>}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleDeleteAccount}
                          disabled={deleteLoading}
                          className="px-3 py-1.5 text-sm rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                          {deleteLoading ? 'Deleting...' : 'Yes, delete everything'}
                        </button>
                        <button
                          onClick={() => { setShowDeleteConfirm(false); setDeleteError(null); }}
                          disabled={deleteLoading}
                          className="px-3 py-1.5 text-sm rounded-full border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Features tab */}
          {tab === 'features' && (
            <div className="space-y-6">
              {/* Appearance card */}
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-settings)] p-6">
                <h2 className="text-base font-bold text-[var(--color-text-primary)] mb-1">Accent color</h2>
                <p className="text-sm text-[var(--color-text-muted)] mb-4">Choose a color theme for the app</p>
                <div className="flex flex-wrap gap-3">
                  {COLOR_PRESETS.map((preset) => {
                    const isActive = (accentColor ?? 'default') === preset.id;
                    return (
                      <button
                        key={preset.id}
                        onClick={() => setAccentColor(preset.id === 'default' ? null : preset.id)}
                        className={cn(
                          'flex flex-col items-center gap-1.5 group'
                        )}
                        title={preset.label}
                      >
                        <div
                          className={cn(
                            'w-8 h-8 rounded-full border-2 transition-all',
                            isActive
                              ? 'border-[var(--color-text-primary)] scale-110'
                              : 'border-transparent hover:border-[var(--color-text-muted)] hover:scale-105'
                          )}
                          style={{ backgroundColor: preset.swatch }}
                        />
                        <span className={cn(
                          'text-[10px]',
                          isActive ? 'text-[var(--color-text-primary)] font-medium' : 'text-[var(--color-text-muted)]'
                        )}>
                          {preset.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Rituals card */}
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-settings)] p-6">
                <h2 className="text-base font-bold text-[var(--color-text-primary)] mb-4">Rituals</h2>

                <RitualRow
                  label="Daily Planning Ritual" desc="Morning planning prompt"
                  enabled={planningRitualEnabled} onToggle={() => setPlanningRitualEnabled(!planningRitualEnabled)}
                >
                  <TimeSelect value={planningRitualHour} onChange={setPlanningRitualHour} range={[5, 12]} disabled={!planningRitualEnabled} />
                </RitualRow>

                <RitualRow
                  label="Daily Review Ritual" desc="Evening reflection prompt"
                  enabled={reviewRitualEnabled} onToggle={() => setReviewRitualEnabled(!reviewRitualEnabled)}
                >
                  <TimeSelect value={reviewRitualHour} onChange={setReviewRitualHour} range={[12, 23]} disabled={!reviewRitualEnabled} />
                </RitualRow>

                <RitualRow
                  label="Weekly Planning Ritual" desc="Weekly planning prompt"
                  enabled={weeklyPlanningEnabled} onToggle={() => setWeeklyPlanningEnabled(!weeklyPlanningEnabled)}
                >
                  <DaySelect value={weeklyPlanningDay} onChange={setWeeklyPlanningDay} disabled={!weeklyPlanningEnabled} names={DAY_NAMES} />
                  <TimeSelect value={weeklyPlanningHour} onChange={setWeeklyPlanningHour} range={[5, 12]} disabled={!weeklyPlanningEnabled} />
                </RitualRow>

                <RitualRow
                  label="Weekly Review Ritual" desc="End of week reflection" last
                  enabled={weeklyReviewEnabled} onToggle={() => setWeeklyReviewEnabled(!weeklyReviewEnabled)}
                >
                  <DaySelect value={weeklyReviewDay} onChange={setWeeklyReviewDay} disabled={!weeklyReviewEnabled} names={DAY_NAMES} />
                  <select
                    value={`${weeklyReviewHour}:${weeklyReviewMinute}`}
                    onChange={(e) => { const [h, m] = e.target.value.split(':').map(Number); setWeeklyReviewHour(h); setWeeklyReviewMinute(m); }}
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
                </RitualRow>
              </div>

              {/* Google Calendar card */}
              {hasGoogleClientId && (
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-settings)] p-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-[var(--color-text-primary)]">Google Calendar</h2>
                    <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
                      {googleCalendarConnected ? 'Connected — events imported during planning' : 'Import calendar events during daily planning'}
                    </p>
                    {calError && <p className="mt-1 text-xs text-red-500">{calError}</p>}
                  </div>
                  {googleCalendarConnected ? (
                    <button onClick={handleDisconnectCalendar} className="px-4 py-1.5 text-sm rounded-full border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] transition-colors flex-shrink-0">
                      Disconnect
                    </button>
                  ) : (
                    <button onClick={handleConnectCalendar} disabled={calConnecting} className="px-4 py-1.5 text-sm rounded-full bg-[var(--color-accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-60 flex-shrink-0">
                      {calConnecting ? 'Connecting...' : 'Connect'}
                    </button>
                  )}
                </div>
              )}

              {/* Changelog */}
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-settings)] p-6">
                <a
                  href="/changelog"
                  className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Changelog & Roadmap
                </a>
              </div>
            </div>
          )}

          {/* Data tab */}
          {tab === 'data' && (
            <div className="space-y-6">
              {/* Export card */}
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-settings)] p-6">
                <h2 className="text-base font-bold text-[var(--color-text-primary)]">Export</h2>
                <p className="text-sm text-[var(--color-text-muted)] mt-0.5 mb-4">Download all your tasks and notes as a Markdown file.</p>
                <button
                  onClick={handleExport}
                  className="px-4 py-1.5 text-sm rounded-full bg-[var(--color-accent)] text-white hover:opacity-90 transition-opacity"
                >
                  Export as Markdown
                </button>
              </div>

              {/* Import card */}
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-settings)] p-6">
                <h2 className="text-base font-bold text-[var(--color-text-primary)]">Import</h2>
                <p className="text-sm text-[var(--color-text-muted)] mt-0.5 mb-4">Import tasks and notes from a Markdown file. Items are merged with existing data.</p>
                <input ref={fileInputRef} type="file" accept=".md,.txt" onChange={handleFileSelect} className="hidden" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-1.5 text-sm rounded-full border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg)] transition-colors"
                >
                  Choose file
                </button>

                {importPreview && (
                  <div className="mt-4 p-4 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]">
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
                      <button onClick={handleConfirmImport} className="px-3 py-1.5 text-sm rounded-full bg-[var(--color-accent)] text-white hover:opacity-90 transition-opacity">
                        Confirm import
                      </button>
                      <button onClick={() => setImportPreview(null)} className="px-3 py-1.5 text-sm rounded-full border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                {importDone && <p className="mt-2 text-xs text-green-600 dark:text-green-400">Import complete!</p>}
              </div>
            </div>
          )}
        </div>
      </div>
  );
}

// --- Helper components ---

function NameFields({ user }: { user: { id: string; user_metadata?: { full_name?: string } } | null }) {
  const fullName = user?.user_metadata?.full_name || '';
  const parts = fullName.split(' ');
  const [firstName, setFirstName] = useState(parts[0] || '');
  const [lastName, setLastName] = useState(parts.slice(1).join(' ') || '');
  const [dirty, setDirty] = useState(false);

  const save = async () => {
    if (!dirty) return;
    const name = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (!supabase) return;
    await supabase.auth.updateUser({ data: { full_name: name } });
    useAuthStore.setState((s) => {
      if (s.user) return { user: { ...s.user, user_metadata: { ...s.user.user_metadata, full_name: name } } };
      return s;
    });
    setDirty(false);
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="text-sm text-[var(--color-text-secondary)] mb-1.5 block">First name</label>
        <input
          value={firstName}
          onChange={(e) => { setFirstName(e.target.value); setDirty(true); }}
          onBlur={save}
          onKeyDown={(e) => { if (e.key === 'Enter') save(); }}
          className="w-full px-4 py-2.5 rounded-xl bg-[var(--color-input-settings)] text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
        />
      </div>
      <div>
        <label className="text-sm text-[var(--color-text-secondary)] mb-1.5 block">Last name</label>
        <input
          value={lastName}
          onChange={(e) => { setLastName(e.target.value); setDirty(true); }}
          onBlur={save}
          onKeyDown={(e) => { if (e.key === 'Enter') save(); }}
          className="w-full px-4 py-2.5 rounded-xl bg-[var(--color-input-settings)] text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
        />
      </div>
    </div>
  );
}

function RitualRow({ label, desc, enabled, onToggle, children, last }: {
  label: string; desc: string; enabled: boolean; onToggle: () => void; children: React.ReactNode; last?: boolean;
}) {
  return (
    <div className={cn('flex items-center justify-between py-3', !last && 'border-b border-[var(--color-border)]')}>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--color-text-primary)]">{label}</p>
        <p className="text-xs text-[var(--color-text-muted)]">{desc}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {children}
        <button
          onClick={onToggle}
          className={`relative w-9 h-5 rounded-full transition-colors ${enabled ? 'bg-blue-500' : 'bg-[var(--color-border)]'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${enabled ? 'translate-x-4' : ''}`} />
        </button>
      </div>
    </div>
  );
}

function TimeSelect({ value, onChange, range, disabled }: { value: number; onChange: (v: number) => void; range: [number, number]; disabled: boolean }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      disabled={disabled}
      className="text-xs px-2 py-1 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] disabled:opacity-40"
    >
      {Array.from({ length: range[1] - range[0] + 1 }, (_, i) => i + range[0]).map((h) => (
        <option key={h} value={h}>{h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`}</option>
      ))}
    </select>
  );
}

function DaySelect({ value, onChange, disabled, names }: { value: number; onChange: (v: number) => void; disabled: boolean; names: string[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      disabled={disabled}
      className="text-xs px-2 py-1 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] disabled:opacity-40"
    >
      {names.map((name, i) => <option key={i} value={i}>{name}</option>)}
    </select>
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
    const dateMatch = trimmed.match(dateRegex);
    if (dateMatch) { currentDayKey = dateMatch[1]; currentIsLater = false; continue; }
    if (inboxRegex.test(trimmed)) { currentDayKey = null; currentIsLater = false; continue; }
    if (laterRegex.test(trimmed)) { currentDayKey = null; currentIsLater = true; continue; }
    const completedMatch = trimmed.match(completedRegex);
    if (completedMatch) { results.push({ dayKey: currentDayKey, isLater: currentIsLater, type: 'task', text: completedMatch[1].trim(), completed: true }); continue; }
    const taskMatch = trimmed.match(taskRegex);
    if (taskMatch) { results.push({ dayKey: currentDayKey, isLater: currentIsLater, type: 'task', text: taskMatch[1].trim(), completed: false }); continue; }
    results.push({ dayKey: currentDayKey, isLater: currentIsLater, type: 'note', text: trimmed, completed: false });
  }
  return results;
}
