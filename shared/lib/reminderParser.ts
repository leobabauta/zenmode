// Natural language time parser for reminders.
// Parses @-prefixed patterns like @3pm, @tomorrow 3pm, @mon 3pm, @mar 20 3pm, etc.
// Also parses "every day @3pm", "every monday @4pm" for recurring reminders.

import type { Recurrence } from '../types';

const DAY_NAMES: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tuesday: 2,
  wed: 3, wednesday: 3,
  thu: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

const MONTH_NAMES: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

/** Parse "3pm", "3:30pm", "15:00" into { hours, minutes } or null. */
function parseTime(s: string): { hours: number; minutes: number } | null {
  // 12-hour: 3pm, 3:30pm, 12:00am
  const m12 = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (m12) {
    let hours = parseInt(m12[1], 10);
    const minutes = m12[2] ? parseInt(m12[2], 10) : 0;
    const period = m12[3].toLowerCase();
    if (hours < 1 || hours > 12 || minutes > 59) return null;
    if (period === 'am' && hours === 12) hours = 0;
    else if (period === 'pm' && hours !== 12) hours += 12;
    return { hours, minutes };
  }
  // 24-hour: 15:00, 08:30
  const m24 = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    const hours = parseInt(m24[1], 10);
    const minutes = parseInt(m24[2], 10);
    if (hours > 23 || minutes > 59) return null;
    return { hours, minutes };
  }
  return null;
}

const DEFAULT_HOUR = 9;
const DEFAULT_MINUTE = 0;

export interface ReminderParseResult {
  cleanText: string;
  reminderAt: string;
  recurrence?: Recurrence;
}

export function parseReminder(text: string): ReminderParseResult | null {
  const now = new Date();

  function setTime(d: Date, hours: number, minutes: number): Date {
    const result = new Date(d);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }

  function today(): Date {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function tomorrow(): Date {
    const d = today();
    d.setDate(d.getDate() + 1);
    return d;
  }

  function nextWeekday(dayNum: number): Date {
    const d = today();
    const current = d.getDay();
    let diff = dayNum - current;
    if (diff <= 0) diff += 7;
    d.setDate(d.getDate() + diff);
    return d;
  }

  // --- Try recurring patterns first: "every day @3pm", "every monday @4pm" ---

  // "every day @3pm" or "every day @15:00"
  const everyDayMatch = text.match(/every\s+day\s+@(\d{1,2}(?::\d{2})?(?:am|pm)|\d{1,2}:\d{2})/i);
  if (everyDayMatch) {
    const t = parseTime(everyDayMatch[1]);
    if (t) {
      let d = setTime(today(), t.hours, t.minutes);
      if (d <= now) d = setTime(tomorrow(), t.hours, t.minutes);
      const cleanText = text
        .slice(0, everyDayMatch.index!)
        .concat(text.slice(everyDayMatch.index! + everyDayMatch[0].length))
        .replace(/\s{2,}/g, ' ').trim();
      return {
        cleanText,
        reminderAt: d.toISOString(),
        recurrence: { type: 'days', interval: 1 },
      };
    }
  }

  // "every weekday @3pm" (Mon-Fri)
  const everyWeekdayMatch = text.match(/every\s+weekday\s+@(\d{1,2}(?::\d{2})?(?:am|pm)|\d{1,2}:\d{2})/i);
  if (everyWeekdayMatch) {
    const t = parseTime(everyWeekdayMatch[1]);
    if (t) {
      // Find next weekday
      let d = setTime(today(), t.hours, t.minutes);
      if (d <= now || d.getDay() === 0 || d.getDay() === 6) {
        d = setTime(tomorrow(), t.hours, t.minutes);
        while (d.getDay() === 0 || d.getDay() === 6) {
          d.setDate(d.getDate() + 1);
          d = setTime(d, t.hours, t.minutes);
        }
      }
      const cleanText = text
        .slice(0, everyWeekdayMatch.index!)
        .concat(text.slice(everyWeekdayMatch.index! + everyWeekdayMatch[0].length))
        .replace(/\s{2,}/g, ' ').trim();
      return {
        cleanText,
        reminderAt: d.toISOString(),
        recurrence: { type: 'weeks', interval: 1, weekdays: [1, 2, 3, 4, 5] },
      };
    }
  }

  // "every monday @3pm", "every mon @15:00", "every tuesday @4pm"
  const dayPattern = Object.keys(DAY_NAMES).join('|');
  const everyDayOfWeekRe = new RegExp(
    `every\\s+(${dayPattern})\\s+@(\\d{1,2}(?::\\d{2})?(?:am|pm)|\\d{1,2}:\\d{2})`,
    'i'
  );
  const everyDowMatch = text.match(everyDayOfWeekRe);
  if (everyDowMatch) {
    const dayNum = DAY_NAMES[everyDowMatch[1].toLowerCase()];
    const t = parseTime(everyDowMatch[2]);
    if (dayNum !== undefined && t) {
      const d = setTime(nextWeekday(dayNum), t.hours, t.minutes);
      const cleanText = text
        .slice(0, everyDowMatch.index!)
        .concat(text.slice(everyDowMatch.index! + everyDowMatch[0].length))
        .replace(/\s{2,}/g, ' ').trim();
      return {
        cleanText,
        reminderAt: d.toISOString(),
        recurrence: { type: 'weeks', interval: 1, weekdays: [dayNum] },
      };
    }
  }

  // --- Non-recurring patterns (existing logic) ---

  let match: RegExpMatchArray | null = null;
  let date: Date | null = null;

  // 1. ISO-ish: @2026-03-20 15:00 or @2026-03-20
  match = text.match(/@(\d{4}-\d{2}-\d{2})(?:\s+(\d{1,2}(?::\d{2})?(?:am|pm)?|\d{1,2}:\d{2}))?/i);
  if (match) {
    const parts = match[1].split('-');
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    if (!isNaN(d.getTime())) {
      if (match[2]) {
        const t = parseTime(match[2]);
        if (t) {
          date = setTime(d, t.hours, t.minutes);
        } else {
          date = setTime(d, DEFAULT_HOUR, DEFAULT_MINUTE);
        }
      } else {
        date = setTime(d, DEFAULT_HOUR, DEFAULT_MINUTE);
      }
    }
  }

  // 2. Numeric date: @3/20 3pm or @3/20
  if (!date) {
    match = text.match(/@(\d{1,2})\/(\d{1,2})(?:\s+(\d{1,2}(?::\d{2})?(?:am|pm)?|\d{1,2}:\d{2}))?/i);
    if (match) {
      const month = parseInt(match[1], 10) - 1;
      const day = parseInt(match[2], 10);
      if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
        const d = new Date(now.getFullYear(), month, day);
        if (d < today()) {
          d.setFullYear(d.getFullYear() + 1);
        }
        if (match[3]) {
          const t = parseTime(match[3]);
          if (t) {
            date = setTime(d, t.hours, t.minutes);
          } else {
            date = setTime(d, DEFAULT_HOUR, DEFAULT_MINUTE);
          }
        } else {
          date = setTime(d, DEFAULT_HOUR, DEFAULT_MINUTE);
        }
      }
    }
  }

  // 3. Month name + day: @mar 20 3pm, @march 20, etc.
  if (!date) {
    const monthPattern = Object.keys(MONTH_NAMES).join('|');
    const re = new RegExp(
      `@(${monthPattern})\\s+(\\d{1,2})(?:\\s+(\\d{1,2}(?::\\d{2})?(?:am|pm)?|\\d{1,2}:\\d{2}))?`,
      'i'
    );
    match = text.match(re);
    if (match) {
      const month = MONTH_NAMES[match[1].toLowerCase()];
      const day = parseInt(match[2], 10);
      if (month !== undefined && day >= 1 && day <= 31) {
        const d = new Date(now.getFullYear(), month, day);
        if (d < today()) {
          d.setFullYear(d.getFullYear() + 1);
        }
        if (match[3]) {
          const t = parseTime(match[3]);
          if (t) {
            date = setTime(d, t.hours, t.minutes);
          } else {
            date = setTime(d, DEFAULT_HOUR, DEFAULT_MINUTE);
          }
        } else {
          date = setTime(d, DEFAULT_HOUR, DEFAULT_MINUTE);
        }
      }
    }
  }

  // 4. Day of week: @mon 3pm, @monday, etc.
  if (!date) {
    const re = new RegExp(
      `@(${dayPattern})(?:\\s+(\\d{1,2}(?::\\d{2})?(?:am|pm)?|\\d{1,2}:\\d{2}))?`,
      'i'
    );
    match = text.match(re);
    if (match) {
      const dayNum = DAY_NAMES[match[1].toLowerCase()];
      if (dayNum !== undefined) {
        const d = nextWeekday(dayNum);
        if (match[2]) {
          const t = parseTime(match[2]);
          if (t) {
            date = setTime(d, t.hours, t.minutes);
          } else {
            date = setTime(d, DEFAULT_HOUR, DEFAULT_MINUTE);
          }
        } else {
          date = setTime(d, DEFAULT_HOUR, DEFAULT_MINUTE);
        }
      }
    }
  }

  // 5. Tomorrow: @tomorrow 3pm, @tomorrow
  if (!date) {
    match = text.match(/@tomorrow(?:\s+(\d{1,2}(?::\d{2})?(?:am|pm)?|\d{1,2}:\d{2}))?/i);
    if (match) {
      const d = tomorrow();
      if (match[1]) {
        const t = parseTime(match[1]);
        if (t) {
          date = setTime(d, t.hours, t.minutes);
        } else {
          date = setTime(d, DEFAULT_HOUR, DEFAULT_MINUTE);
        }
      } else {
        date = setTime(d, DEFAULT_HOUR, DEFAULT_MINUTE);
      }
    }
  }

  // 6. Time only: @3pm, @3:30pm, @15:00
  if (!date) {
    match = text.match(/@(\d{1,2}(?::\d{2})?(?:am|pm)|\d{1,2}:\d{2})/i);
    if (match) {
      const t = parseTime(match[1]);
      if (t) {
        let d = setTime(today(), t.hours, t.minutes);
        if (d <= now) {
          d = setTime(tomorrow(), t.hours, t.minutes);
        }
        date = d;
      }
    }
  }

  if (!date || !match) return null;

  const cleanText = text
    .slice(0, match.index!)
    .concat(text.slice(match.index! + match[0].length))
    .replace(/\s{2,}/g, ' ')
    .trim();

  return {
    cleanText,
    reminderAt: date.toISOString(),
  };
}
