import { View, Text, StyleSheet } from 'react-native';
import { useAuthStore } from '../../../shared/store/useAuthStore';
import { formatDayLabel } from '../../../shared/lib/dates';
import type { Colors } from '../lib/colors';

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

interface GreetingBannerProps {
  colors: Colors;
}

export function GreetingBanner({ colors }: GreetingBannerProps) {
  const user = useAuthStore((s) => s.user);
  const firstName = getFirstName(user);
  const greeting = getGreeting();
  const dateLabel = formatDayLabel(new Date());

  return (
    <View style={styles.container}>
      <Text style={[styles.greeting, { color: colors.text }]}>Today</Text>
      <Text style={[styles.dateLabel, { color: colors.textMuted }]}>
        {dateLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  greeting: {
    fontSize: 34,
    fontWeight: '700',
    lineHeight: 40,
  },
  dateLabel: {
    fontSize: 13,
    marginTop: 2,
  },
  guidance: {
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
  },
});
