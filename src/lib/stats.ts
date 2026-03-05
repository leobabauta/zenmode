import type { PlannerItem } from '../types';

type PriorityLevel = 'high' | 'medium' | 'other';

function getPriority(item: PlannerItem): PriorityLevel {
  if (item.isPriority) return 'high';
  if (item.isMediumPriority) return 'medium';
  return 'other';
}

/** Filter to top-level tasks only (no notes, no children) */
function topLevelTasks(items: Record<string, PlannerItem>): PlannerItem[] {
  return Object.values(items).filter(
    (i) => i.type === 'task' && !i.parentId
  );
}

// --- Daily completion stats ---

export interface DailyCompletionEntry {
  dayKey: string;
  high: number;
  medium: number;
  other: number;
  total: number;
}

export function computeDailyCompletionStats(items: Record<string, PlannerItem>): DailyCompletionEntry[] {
  const byDay: Record<string, DailyCompletionEntry> = {};

  for (const item of topLevelTasks(items)) {
    if (!item.completed || !item.dayKey) continue;
    if (!byDay[item.dayKey]) {
      byDay[item.dayKey] = { dayKey: item.dayKey, high: 0, medium: 0, other: 0, total: 0 };
    }
    const entry = byDay[item.dayKey];
    const p = getPriority(item);
    entry[p]++;
    entry.total++;
  }

  return Object.values(byDay).sort((a, b) => a.dayKey.localeCompare(b.dayKey));
}

// --- Day of week averages ---

export interface DayOfWeekAverage {
  dayOfWeek: number; // 0=Sun..6=Sat
  label: string;
  high: number;
  medium: number;
  other: number;
  total: number;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function computeDayOfWeekAverages(dailyStats: DailyCompletionEntry[]): DayOfWeekAverage[] {
  const sums: Record<number, { high: number; medium: number; other: number; total: number; count: number }> = {};
  for (let d = 0; d < 7; d++) sums[d] = { high: 0, medium: 0, other: 0, total: 0, count: 0 };

  for (const entry of dailyStats) {
    const dow = new Date(entry.dayKey + 'T12:00:00').getDay();
    sums[dow].high += entry.high;
    sums[dow].medium += entry.medium;
    sums[dow].other += entry.other;
    sums[dow].total += entry.total;
    sums[dow].count++;
  }

  return Array.from({ length: 7 }, (_, d) => ({
    dayOfWeek: d,
    label: DAY_LABELS[d],
    high: sums[d].count ? Math.round((sums[d].high / sums[d].count) * 10) / 10 : 0,
    medium: sums[d].count ? Math.round((sums[d].medium / sums[d].count) * 10) / 10 : 0,
    other: sums[d].count ? Math.round((sums[d].other / sums[d].count) * 10) / 10 : 0,
    total: sums[d].count ? Math.round((sums[d].total / sums[d].count) * 10) / 10 : 0,
  }));
}

// --- Weekly trends ---

export interface WeeklyTrend {
  weekLabel: string; // "Mar 3" format
  weekStart: string; // ISO day key of Monday
  high: number;
  medium: number;
  other: number;
  total: number;
}

export function computeWeeklyTrends(dailyStats: DailyCompletionEntry[], numWeeks = 8): WeeklyTrend[] {
  // Find the Monday of the current week
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const currentMonday = new Date(now);
  currentMonday.setDate(now.getDate() + mondayOffset);
  currentMonday.setHours(0, 0, 0, 0);

  const weeks: WeeklyTrend[] = [];
  for (let w = numWeeks - 1; w >= 0; w--) {
    const weekStart = new Date(currentMonday);
    weekStart.setDate(currentMonday.getDate() - w * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const startKey = toKey(weekStart);
    const endKey = toKey(weekEnd);

    const entry: WeeklyTrend = {
      weekLabel: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      weekStart: startKey,
      high: 0,
      medium: 0,
      other: 0,
      total: 0,
    };

    for (const day of dailyStats) {
      if (day.dayKey >= startKey && day.dayKey <= endKey) {
        entry.high += day.high;
        entry.medium += day.medium;
        entry.other += day.other;
        entry.total += day.total;
      }
    }

    weeks.push(entry);
  }

  return weeks;
}

function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// --- Completion rates ---

export interface CompletionRates {
  priority: PriorityLevel;
  completed: number;
  pushed: number; // consecutiveMoves > 0
  movedLater: number; // isLater === true
  total: number;
}

export function computeCompletionRates(items: Record<string, PlannerItem>): CompletionRates[] {
  const rates: Record<PriorityLevel, CompletionRates> = {
    high: { priority: 'high', completed: 0, pushed: 0, movedLater: 0, total: 0 },
    medium: { priority: 'medium', completed: 0, pushed: 0, movedLater: 0, total: 0 },
    other: { priority: 'other', completed: 0, pushed: 0, movedLater: 0, total: 0 },
  };

  for (const item of topLevelTasks(items)) {
    const p = getPriority(item);
    rates[p].total++;
    if (item.completed) {
      rates[p].completed++;
    } else if (item.isLater) {
      rates[p].movedLater++;
    } else if ((item.consecutiveMoves ?? 0) > 0) {
      rates[p].pushed++;
    }
  }

  return [rates.high, rates.medium, rates.other];
}

// --- Completion order ---

export interface CompletionOrderEntry {
  priority: PriorityLevel;
  avgRank: number;
  sampleSize: number;
}

export function computeCompletionOrder(items: Record<string, PlannerItem>): CompletionOrderEntry[] {
  // Group completed items by dayKey, then rank by completedAt within each day
  const byDay: Record<string, PlannerItem[]> = {};
  for (const item of topLevelTasks(items)) {
    if (!item.completed || !item.completedAt || !item.dayKey) continue;
    if (!byDay[item.dayKey]) byDay[item.dayKey] = [];
    byDay[item.dayKey].push(item);
  }

  const ranks: Record<PriorityLevel, number[]> = { high: [], medium: [], other: [] };

  for (const dayItems of Object.values(byDay)) {
    if (dayItems.length < 2) continue; // need at least 2 to rank
    dayItems.sort((a, b) => (a.completedAt!).localeCompare(b.completedAt!));
    dayItems.forEach((item, idx) => {
      const p = getPriority(item);
      ranks[p].push(idx + 1);
    });
  }

  return (['high', 'medium', 'other'] as PriorityLevel[]).map((p) => ({
    priority: p,
    avgRank: ranks[p].length ? Math.round((ranks[p].reduce((a, b) => a + b, 0) / ranks[p].length) * 10) / 10 : 0,
    sampleSize: ranks[p].length,
  }));
}

// --- Timer stats ---

export interface TimerStatsEntry {
  priority: PriorityLevel;
  avgDuration: number; // seconds
  totalSessions: number;
}

export function computeTimerStats(items: Record<string, PlannerItem>): TimerStatsEntry[] {
  const durations: Record<PriorityLevel, number[]> = { high: [], medium: [], other: [] };

  for (const item of topLevelTasks(items)) {
    if (!item.timerSessions?.length) continue;
    const p = getPriority(item);
    for (const session of item.timerSessions) {
      durations[p].push(session.duration);
    }
  }

  return (['high', 'medium', 'other'] as PriorityLevel[]).map((p) => ({
    priority: p,
    avgDuration: durations[p].length ? Math.round(durations[p].reduce((a, b) => a + b, 0) / durations[p].length) : 0,
    totalSessions: durations[p].length,
  }));
}
