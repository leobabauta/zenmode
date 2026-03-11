// Google Identity Services types
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string; expires_in?: number }) => void;
          }) => { requestAccessToken: () => void };
        };
      };
    };
  }
}

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

function saveCachedToken(token: string, expiresIn: number) {
  // Subtract 60s buffer so we don't use a token right at expiry
  const expiresAt = Date.now() + (expiresIn - 60) * 1000;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, expiresAt }));
}

let accessToken: string | null = loadCachedToken();

export function clearCalendarToken() {
  accessToken = null;
  localStorage.removeItem(STORAGE_KEY);
}

export function requestCalendarAccess(): Promise<string> {
  return new Promise((resolve, reject) => {
    // Check in-memory token first, then localStorage
    if (!accessToken) {
      accessToken = loadCachedToken();
    }
    if (accessToken) {
      resolve(accessToken);
      return;
    }

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      reject(new Error('Google Client ID not configured'));
      return;
    }

    if (!window.google?.accounts?.oauth2) {
      reject(new Error('Google Identity Services not loaded'));
      return;
    }

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/calendar.events.readonly',
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error));
          return;
        }
        if (response.access_token) {
          accessToken = response.access_token;
          saveCachedToken(response.access_token, response.expires_in ?? 3600);
          resolve(response.access_token);
        } else {
          reject(new Error('No access token received'));
        }
      },
    });

    client.requestAccessToken();
  });
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
    // Token expired — clear cached token and retry once
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
