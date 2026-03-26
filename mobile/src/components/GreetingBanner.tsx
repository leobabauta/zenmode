import { View, Text, StyleSheet } from 'react-native';
import { formatDayLabel } from '../../../shared/lib/dates';
import type { Colors } from '../lib/colors';

interface GreetingBannerProps {
  colors: Colors;
}

export function GreetingBanner({ colors }: GreetingBannerProps) {
  const dateLabel = formatDayLabel(new Date());

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>Today</Text>
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
    paddingTop: 20,
  },
  title: {
    fontSize: 40,
    fontWeight: '700',
    lineHeight: 46,
  },
  dateLabel: {
    fontSize: 16,
    marginTop: 4,
  },
});
