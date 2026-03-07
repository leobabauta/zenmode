export type ItemType = 'task' | 'note';

export type RecurrenceType = 'days' | 'weeks' | 'months' | 'weekday';

export interface Recurrence {
  type: RecurrenceType;
  interval: number;      // e.g. 2 = "every 2 days"; ignored for 'weeks'/'weekday'
  weekday?: number;      // 0=Sun..6=Sat; legacy for type 'weekday'
  weekdays?: number[];   // 0=Sun..6=Sat; for type 'weeks' (multi-select)
  dayOfMonth?: number;   // 1-31; for type 'months'
}

export interface PlannerItem {
  id: string;
  type: ItemType;
  text: string;
  completed: boolean;
  dayKey: string | null; // "YYYY-MM-DD" or null = inbox/later
  isLater?: boolean;     // true = Later Archive, false/undefined = Inbox
  order: number;
  createdAt: string;
  updatedAt: string;
  recurrence?: Recurrence;
  parentId?: string;
  consecutiveMoves?: number;
  isPriority?: boolean;
  isMediumPriority?: boolean;
  isPractice?: boolean;
  listId?: string;
  completedAt?: string;
  timerSessions?: Array<{ startedAt: string; duration: number }>;
  isArchived?: boolean;
  notes?: string;
}

export interface CustomList {
  id: string;
  name: string;
  order: number;
}

export interface WeeklyPlan {
  weekKey: string;        // "YYYY-MM-DD" of Monday
  priorities: Array<{ id: string; text: string; dayKey?: string }>;
  intentions: string;
  completedAt: string;
}

export interface WeeklyReview {
  weekKey: string;
  priorityReflections: string;
  wins: string;
  learned: string;
  completedAt: string;
}

export interface DaySlot {
  key: string;      // "YYYY-MM-DD"
  date: Date;
  isToday: boolean;
  isPast: boolean;
  items: PlannerItem[];
}
