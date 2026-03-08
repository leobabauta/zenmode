import { useMemo } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';
import {
  computeDailyCompletionStats,
  computeDayOfWeekAverages,
  computeWeeklyTrends,
  computeCompletionRates,
  computeCompletionOrder,
  computeTimerStats,
} from '../../lib/stats';

const PRIORITY_COLORS = {
  high: '#ef4444',
  medium: '#f59e0b',
  other: '#6b7280',
};

const PRIORITY_LABELS = {
  high: 'High',
  medium: 'Medium',
  other: 'Other',
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export function StatsView() {
  const items = usePlannerStore((s) => s.items);

  const dailyStats = useMemo(() => computeDailyCompletionStats(items), [items]);
  const dowAverages = useMemo(() => computeDayOfWeekAverages(dailyStats), [dailyStats]);
  const weeklyTrends = useMemo(() => computeWeeklyTrends(dailyStats), [dailyStats]);
  const completionRates = useMemo(() => computeCompletionRates(items), [items]);
  const completionOrder = useMemo(() => computeCompletionOrder(items), [items]);
  const timerStats = useMemo(() => computeTimerStats(items), [items]);

  // Compute overall daily averages
  const totalDays = dailyStats.length || 1;
  const avgHigh = Math.round((dailyStats.reduce((s, d) => s + d.high, 0) / totalDays) * 10) / 10;
  const avgMed = Math.round((dailyStats.reduce((s, d) => s + d.medium, 0) / totalDays) * 10) / 10;
  const avgOther = Math.round((dailyStats.reduce((s, d) => s + d.other, 0) / totalDays) * 10) / 10;

  const maxDow = Math.max(...dowAverages.map((d) => d.total), 1);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-5xl font-extrabold text-[var(--color-text-primary)] mt-6">Stats</h1>

        {/* 1. Daily Averages */}
        <section>
          <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
            Daily Averages
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {([['high', avgHigh], ['medium', avgMed], ['other', avgOther]] as const).map(([p, avg]) => (
              <div
                key={p}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
                style={{ borderTopWidth: 3, borderTopColor: PRIORITY_COLORS[p] }}
              >
                <div className="text-2xl font-bold text-[var(--color-text-primary)]">{avg}</div>
                <div className="text-xs text-[var(--color-text-muted)] mt-1">{PRIORITY_LABELS[p]} / day</div>
              </div>
            ))}
          </div>
          {dailyStats.length === 0 && (
            <p className="text-sm text-[var(--color-text-muted)] mt-2">No completed tasks yet.</p>
          )}
        </section>

        {/* 2. Day of Week */}
        <section>
          <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
            Day of Week
          </h2>
          <div className="space-y-2">
            {/* Reorder to start on Monday */}
            {[1, 2, 3, 4, 5, 6, 0].map((d) => {
              const entry = dowAverages[d];
              return (
                <div key={d} className="flex items-center gap-2">
                  <span className="text-xs text-[var(--color-text-muted)] w-8 text-right">{entry.label}</span>
                  <div className="flex-1 h-5 bg-[var(--color-surface)] rounded overflow-hidden flex">
                    {entry.high > 0 && (
                      <div
                        className="h-full"
                        style={{ width: `${(entry.high / maxDow) * 100}%`, backgroundColor: PRIORITY_COLORS.high }}
                      />
                    )}
                    {entry.medium > 0 && (
                      <div
                        className="h-full"
                        style={{ width: `${(entry.medium / maxDow) * 100}%`, backgroundColor: PRIORITY_COLORS.medium }}
                      />
                    )}
                    {entry.other > 0 && (
                      <div
                        className="h-full"
                        style={{ width: `${(entry.other / maxDow) * 100}%`, backgroundColor: PRIORITY_COLORS.other }}
                      />
                    )}
                  </div>
                  <span className="text-xs text-[var(--color-text-muted)] w-8">{entry.total}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* 3. Weekly Trends */}
        <section>
          <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
            Weekly Trends
          </h2>
          <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--color-surface)]">
                  <th className="text-left px-3 py-2 text-xs font-medium text-[var(--color-text-muted)]">Week</th>
                  <th className="text-right px-3 py-2 text-xs font-medium" style={{ color: PRIORITY_COLORS.high }}>High</th>
                  <th className="text-right px-3 py-2 text-xs font-medium" style={{ color: PRIORITY_COLORS.medium }}>Med</th>
                  <th className="text-right px-3 py-2 text-xs font-medium" style={{ color: PRIORITY_COLORS.other }}>Other</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-[var(--color-text-muted)]">Total</th>
                </tr>
              </thead>
              <tbody>
                {weeklyTrends.map((week) => (
                  <tr key={week.weekStart} className="border-t border-[var(--color-border)]">
                    <td className="px-3 py-2 text-[var(--color-text-secondary)]">{week.weekLabel}</td>
                    <td className="px-3 py-2 text-right text-[var(--color-text-primary)]">{week.high}</td>
                    <td className="px-3 py-2 text-right text-[var(--color-text-primary)]">{week.medium}</td>
                    <td className="px-3 py-2 text-right text-[var(--color-text-primary)]">{week.other}</td>
                    <td className="px-3 py-2 text-right font-medium text-[var(--color-text-primary)]">{week.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 4. Completion Rates */}
        <section>
          <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
            Completion Rates
          </h2>
          <div className="space-y-3">
            {completionRates.map((rate) => {
              if (rate.total === 0) return null;
              const completedPct = Math.round((rate.completed / rate.total) * 100);
              const pushedPct = Math.round((rate.pushed / rate.total) * 100);
              const laterPct = Math.round((rate.movedLater / rate.total) * 100);
              return (
                <div key={rate.priority}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium" style={{ color: PRIORITY_COLORS[rate.priority] }}>
                      {PRIORITY_LABELS[rate.priority]}
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)]">{rate.total} tasks</span>
                  </div>
                  <div className="h-4 bg-[var(--color-surface)] rounded overflow-hidden flex">
                    {completedPct > 0 && (
                      <div className="h-full bg-emerald-500" style={{ width: `${completedPct}%` }} title={`Completed: ${completedPct}%`} />
                    )}
                    {pushedPct > 0 && (
                      <div className="h-full bg-amber-400" style={{ width: `${pushedPct}%` }} title={`Pushed: ${pushedPct}%`} />
                    )}
                    {laterPct > 0 && (
                      <div className="h-full bg-red-400" style={{ width: `${laterPct}%` }} title={`Moved later: ${laterPct}%`} />
                    )}
                  </div>
                  <div className="flex gap-4 mt-1 text-xs text-[var(--color-text-muted)]">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> {completedPct}% done
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-400" /> {pushedPct}% pushed
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-400" /> {laterPct}% later
                    </span>
                  </div>
                </div>
              );
            })}
            {completionRates.every((r) => r.total === 0) && (
              <p className="text-sm text-[var(--color-text-muted)]">No tasks to analyze yet.</p>
            )}
          </div>
        </section>

        {/* 5. Completion Order */}
        <section>
          <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
            Completion Order
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mb-3">
            Average position in daily completion sequence (lower = completed earlier in the day)
          </p>
          <div className="grid grid-cols-3 gap-3">
            {completionOrder.map((entry) => (
              <div
                key={entry.priority}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-center"
              >
                <div className="text-2xl font-bold text-[var(--color-text-primary)]">
                  {entry.sampleSize > 0 ? `#${entry.avgRank}` : '--'}
                </div>
                <div className="text-xs mt-1" style={{ color: PRIORITY_COLORS[entry.priority] }}>
                  {PRIORITY_LABELS[entry.priority]}
                </div>
                <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  {entry.sampleSize} samples
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 6. Focus Time */}
        <section>
          <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
            Focus Time
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {timerStats.map((entry) => (
              <div
                key={entry.priority}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-center"
              >
                <div className="text-2xl font-bold text-[var(--color-text-primary)]">
                  {entry.totalSessions > 0 ? formatDuration(entry.avgDuration) : '--'}
                </div>
                <div className="text-xs mt-1" style={{ color: PRIORITY_COLORS[entry.priority] }}>
                  {PRIORITY_LABELS[entry.priority]}
                </div>
                <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  {entry.totalSessions} sessions
                </div>
              </div>
            ))}
          </div>
          {timerStats.every((t) => t.totalSessions === 0) && (
            <p className="text-sm text-[var(--color-text-muted)] mt-2">No focus timer sessions recorded yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}
