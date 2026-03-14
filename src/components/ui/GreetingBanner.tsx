import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { usePlannerStore } from '../../store/usePlannerStore';
import { formatDayLabel, toDayKey } from '../../lib/dates';

const GUIDANCE = [
  "Take a breath. Focus on what matters most today, and let the rest wait.",
  "Start with your most important task. Everything else will fall into place.",
  "You don't have to do it all. Pick what matters and give it your full attention.",
  "Progress over perfection. One focused step forward is enough.",
  "Clear your mind, then clear your list. One task at a time.",
  "What would make today feel meaningful? Start there.",
  "Small, focused actions create big results over time.",
  "Be intentional with your energy. Do less, but do it well.",
];

const TIPS = [
  { text: 'Press ⌘K to open the Command-K palette — search tasks, jump to views, and take quick actions.', keys: '⌘K' },
  { text: 'Press M with a task selected to move it to a different day.', keys: 'M' },
  { text: 'Press S to toggle the sidebar for a distraction-free workspace.', keys: 'S' },
  { text: 'Today view is your home base — press T to jump there and focus on what matters right now.', keys: 'T' },
  { text: 'Press N to quickly add a new task without reaching for the mouse.', keys: 'N' },
  { text: 'Use #hashtags in your tasks to organize them into filterable labels.', keys: '#' },
  { text: 'Press H to see the Timeline — your bird\'s-eye view of the week ahead.', keys: 'H' },
  { text: 'Star up to 3 top priorities each day to stay focused on what matters most.', keys: '★' },
  { text: 'Press X to quickly check off the selected task.', keys: 'X' },
  { text: 'Press E to edit a task inline — no need to click.', keys: 'E' },
  { text: 'Press ? to see all keyboard shortcuts at a glance.', keys: '?' },
  { text: 'Drag tasks to reorder them, or drag to a different day in the Timeline.', keys: '↕' },
];

const TIP_STORAGE_KEY = 'zenmode-daily-tip';
const VIDEO_TIP_STORAGE_KEY = 'zenmode-video-tips';
const TIP_DURATION_MS = 60 * 60 * 1000; // 1 hour

const VIDEO_TUTORIALS = [
  {
    id: 'features',
    title: 'Explore More Features',
    description: 'Discover all the ways zenmode can help you stay organized.',
    embed: 'https://player.vimeo.com/video/1173462404?h=127ea71dd9&title=0&byline=0&portrait=0',
    dayOffset: 0, // same day as onboarding (later)
    minHoursAfterOnboarding: 2,
  },
  {
    id: 'rituals',
    title: 'Daily Rituals',
    description: 'Learn how morning planning and evening review rituals can transform your day.',
    embed: 'https://player.vimeo.com/video/1173462407?h=1e1be28cb7&title=0&byline=0&portrait=0',
    dayOffset: 1, // day after onboarding
    minHoursAfterOnboarding: 0,
  },
];

interface VideoTipState {
  dismissedIds: string[];
}

function getVideoTipState(): VideoTipState {
  try {
    const stored = localStorage.getItem(VIDEO_TIP_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return { dismissedIds: [] };
}

function dismissVideoTip(id: string) {
  const state = getVideoTipState();
  if (!state.dismissedIds.includes(id)) {
    state.dismissedIds.push(id);
  }
  localStorage.setItem(VIDEO_TIP_STORAGE_KEY, JSON.stringify(state));
}

function getActiveVideoTutorial(onboardingDate: string | null): typeof VIDEO_TUTORIALS[number] | null {
  if (!onboardingDate) return null;

  const state = getVideoTipState();
  const now = new Date();
  const onboardingDay = new Date(onboardingDate + 'T00:00:00');
  const daysSinceOnboarding = Math.floor((now.getTime() - onboardingDay.getTime()) / 86400000);
  const hoursSinceOnboarding = (now.getTime() - onboardingDay.getTime()) / (1000 * 60 * 60);

  for (const tutorial of VIDEO_TUTORIALS) {
    if (state.dismissedIds.includes(tutorial.id)) continue;
    if (daysSinceOnboarding >= tutorial.dayOffset && hoursSinceOnboarding >= tutorial.minHoursAfterOnboarding) {
      // On day 0 (same day), only show if enough hours have passed
      // On day 1+, show immediately
      return tutorial;
    }
  }
  return null;
}

function getDailyTip(): { text: string; keys: string } | null {
  const todayKey = toDayKey(new Date());

  try {
    const stored = localStorage.getItem(TIP_STORAGE_KEY);
    if (stored) {
      const { dayKey, shownAt } = JSON.parse(stored);
      // Same day — check if still within the hour
      if (dayKey === todayKey) {
        if (Date.now() - shownAt < TIP_DURATION_MS) {
          // Return the same tip for this session
          const tipIndex = new Date(shownAt).getTime() % TIPS.length;
          return TIPS[tipIndex];
        }
        // Hour has passed
        return null;
      }
    }
  } catch {
    // ignore parse errors
  }

  // New day — pick a tip and store the timestamp
  const now = Date.now();
  const dayOfYear = Math.floor(
    (now - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  const tipIndex = dayOfYear % TIPS.length;
  localStorage.setItem(TIP_STORAGE_KEY, JSON.stringify({ dayKey: todayKey, shownAt: now }));
  return TIPS[tipIndex];
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getFirstName(user: { user_metadata?: { full_name?: string }; email?: string } | null): string {
  if (!user) return '';
  const full = user.user_metadata?.full_name;
  if (full) return full.split(' ')[0];
  return '';
}

function getDailyGuidance(): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return GUIDANCE[dayOfYear % GUIDANCE.length];
}

export function GreetingBanner() {
  const user = useAuthStore((s) => s.user);
  const setView = usePlannerStore((s) => s.setView);
  const onboardingCompletedDate = usePlannerStore((s) => s.onboardingCompletedDate);
  const firstName = getFirstName(user);
  const greeting = getGreeting();
  const today = new Date();
  const dateLabel = formatDayLabel(today);
  const [tip, setTip] = useState<{ text: string; keys: string } | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    try {
      const stored = localStorage.getItem(TIP_STORAGE_KEY);
      if (stored) {
        const { dayKey, dismissed: d } = JSON.parse(stored);
        return d && dayKey === toDayKey(new Date());
      }
    } catch { /* ignore */ }
    return false;
  });

  const [videoTutorial, setVideoTutorial] = useState<typeof VIDEO_TUTORIALS[number] | null>(null);
  const [videoDismissed, setVideoDismissed] = useState(false);
  const [videoExpanded, setVideoExpanded] = useState(false);

  useEffect(() => {
    setTip(getDailyTip());

    // Auto-hide when the hour expires
    const interval = setInterval(() => {
      const current = getDailyTip();
      if (!current) setTip(null);
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const active = getActiveVideoTutorial(onboardingCompletedDate);
    setVideoTutorial(active);
    setVideoDismissed(false);
    setVideoExpanded(false);
  }, [onboardingCompletedDate]);

  return (
    <div className="mb-8 mt-16">
      <h1
        className="text-5xl font-bold dark:font-extrabold text-[var(--color-text-primary)] cursor-pointer hover:text-[var(--color-accent)] transition-colors"
        onClick={() => setView('today')}
      >
        {greeting}{firstName ? `, ${firstName}` : ''}
      </h1>
      <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
        It&apos;s {dateLabel}
      </p>
      <p className="text-sm text-[var(--color-text-secondary)] mt-2 leading-relaxed">
        {getDailyGuidance()}
      </p>

      {/* Video tutorial suggestion */}
      {videoTutorial && !videoDismissed && (
        <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="flex-shrink-0 text-blue-500">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
              </svg>
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--color-text-primary)]">{videoTutorial.title}</p>
              <p className="text-xs text-[var(--color-text-muted)]">{videoTutorial.description}</p>
            </div>
            <button
              onClick={() => setVideoExpanded(!videoExpanded)}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 transition-colors"
            >
              {videoExpanded ? 'Hide' : 'Watch'}
            </button>
            <button
              onClick={() => {
                setVideoDismissed(true);
                dismissVideoTip(videoTutorial.id);
              }}
              className="flex-shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
              title="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {videoExpanded && (
            <div style={{ padding: '56.25% 0 0 0', position: 'relative' }}>
              <iframe
                src={videoTutorial.embed}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                frameBorder="0"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                title={videoTutorial.title}
              />
            </div>
          )}
        </div>
      )}

      {tip && !dismissed && (
        <div className="mt-3 flex items-start gap-2 text-sm text-[var(--color-text-secondary)] leading-relaxed">
          <span className="flex-shrink-0 mt-0.5 text-amber-400" title="Daily tip">💡</span>
          <span>{tip.text}</span>
          <button
            onClick={() => {
              setDismissed(true);
              try {
                const stored = JSON.parse(localStorage.getItem(TIP_STORAGE_KEY) || '{}');
                stored.dismissed = true;
                localStorage.setItem(TIP_STORAGE_KEY, JSON.stringify(stored));
              } catch { /* ignore */ }
            }}
            className="flex-shrink-0 ml-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
            title="Dismiss tip"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
