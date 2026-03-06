import { useAuthStore } from '../../store/useAuthStore';
import { formatDayLabel } from '../../lib/dates';

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
  const firstName = getFirstName(user);
  const greeting = getGreeting();
  const today = new Date();
  const dateLabel = formatDayLabel(today);

  return (
    <div className="mb-4">
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
        {greeting}{firstName ? `, ${firstName}` : ''}
      </h1>
      <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
        It&apos;s {dateLabel}
      </p>
      <p className="text-sm text-[var(--color-text-secondary)] mt-2 leading-relaxed">
        {getDailyGuidance()}
      </p>
    </div>
  );
}
