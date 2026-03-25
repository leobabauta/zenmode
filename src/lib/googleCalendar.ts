import { supabase } from './supabase';

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

const STORAGE_KEY = 'zenmode-gcal-token';

function loadCachedToken(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const { token, expiresAt } = JSON.parse(raw);
    if (typeof token === 'string' && typeof expiresAt === 'number' && Date.now() < expiresAt) {
      return token;
    }
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return null;
}

export function saveCachedToken(token: string, expiresIn: number) {
  // Subtract 60s buffer so we don't use a token right at expiry
  const expiresAt = Date.now() + (expiresIn - 60) * 1000;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, expiresAt }));
  accessToken = token;
}

let accessToken: string | null = loadCachedToken();

export function clearCalendarToken() {
  accessToken = null;
  localStorage.removeItem(STORAGE_KEY);
}

/** Returns true if we have a non-expired cached token (safe to fetch without popup) */
export function hasCachedCalendarToken(): boolean {
  if (!accessToken) accessToken = loadCachedToken();
  return !!accessToken;
}

/**
 * Get a valid Google Calendar access token.
 * First checks the local cache, then tries to refresh via the Edge Function
 * (using the stored Google refresh token — no popup needed).
 */
export async function requestCalendarAccess(): Promise<string> {
  // Check cached token first
  if (!accessToken) accessToken = loadCachedToken();
  if (accessToken) return accessToken;

  // No cached token — try refreshing via the Edge Function
  if (!supabase) throw new Error('Supabase not configured');

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in');

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/refresh-google-token`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to refresh calendar token');
  }

  const data = await res.json();
  saveCachedToken(data.access_token, data.expires_in ?? 3600);
  return data.access_token;
}

export async function fetchTodayEvents(): Promise<CalendarEvent[]> {
  const token = await requestCalendarAccess();

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const params = new URLSearchParams({
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (res.status === 401) {
    // Token expired — clear cached token and retry via Edge Function
    clearCalendarToken();
    const newToken = await requestCalendarAccess();
    const retry = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
      { headers: { Authorization: `Bearer ${newToken}` } }
    );
    if (!retry.ok) throw new Error('Failed to fetch calendar events');
    const data = await retry.json();
    return data.items ?? [];
  }

  if (!res.ok) throw new Error('Failed to fetch calendar events');
  const data = await res.json();
  return data.items ?? [];
}

export function formatEventAsTask(event: CalendarEvent): string {
  if (event.start.dateTime) {
    const d = new Date(event.start.dateTime);
    const h = d.getHours();
    const m = d.getMinutes();
    const suffix = h >= 12 ? 'p' : 'a';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const time = m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, '0')}${suffix}`;
    return `${event.summary} ${time}`;
  }
  return event.summary;
}
