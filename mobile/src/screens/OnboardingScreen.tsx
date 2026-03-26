import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Dimensions, FlatList, TouchableOpacity,
  type ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle as SvgCircle, Rect, Line } from 'react-native-svg';
import { useColors, type Colors } from '../lib/colors';
import { usePlannerStore } from '../store/usePlannerStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Page {
  title: string;
  subtitle: string;
  illustration: (colors: Colors) => React.ReactNode;
}

function WelcomeIllustration({ colors }: { colors: Colors }) {
  return (
    <View style={illStyles.container}>
      <View style={[illStyles.circle, { backgroundColor: colors.accentTint }]}>
        <Svg width={64} height={64} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
            stroke={colors.accent}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
      <Text style={[illStyles.brand, { color: colors.accent }]}>zenmode</Text>
    </View>
  );
}

function SwipeIllustration({ colors }: { colors: Colors }) {
  return (
    <View style={illStyles.container}>
      {/* Mock task rows with swipe arrows */}
      {['Plan the day', 'Review notes'].map((label, i) => (
        <View key={i} style={[illStyles.mockRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[illStyles.mockCheckbox, { borderColor: colors.checkboxBorder }]} />
          <Text style={[illStyles.mockText, { color: colors.text }]}>{label}</Text>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path d="M8 12h8m0 0l-3-3m3 3l-3 3" stroke={colors.textMuted} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
      ))}
      <View style={illStyles.arrowRow}>
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
          <Path d="M15.75 19.5L8.25 12l7.5-7.5" stroke={colors.accent} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
        <Text style={[illStyles.arrowLabel, { color: colors.accent }]}>swipe left or right</Text>
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
          <Path d="M8.25 4.5l7.5 7.5-7.5 7.5" stroke={colors.accent} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </View>
    </View>
  );
}

function DragIllustration({ colors }: { colors: Colors }) {
  return (
    <View style={illStyles.container}>
      {['Top priority', 'Write report', 'Call dentist'].map((label, i) => (
        <View key={i} style={[illStyles.mockRow, { backgroundColor: colors.surface, borderColor: colors.border }, i === 0 && { backgroundColor: colors.accentTint, borderColor: colors.accent }]}>
          <Svg width={16} height={16} viewBox="0 0 16 16" fill={colors.textMuted}>
            <SvgCircle cx="5" cy="4" r="1.5" />
            <SvgCircle cx="11" cy="4" r="1.5" />
            <SvgCircle cx="5" cy="8" r="1.5" />
            <SvgCircle cx="11" cy="8" r="1.5" />
            <SvgCircle cx="5" cy="12" r="1.5" />
            <SvgCircle cx="11" cy="12" r="1.5" />
          </Svg>
          <Text style={[illStyles.mockText, { color: colors.text }]}>{label}</Text>
        </View>
      ))}
      <View style={illStyles.arrowRow}>
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
          <Path d="M12 4.5v15m0-15l-3 3m3-3l3 3m-3 15l-3-3m3 3l3-3" stroke={colors.accent} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
        <Text style={[illStyles.arrowLabel, { color: colors.accent }]}>long press & drag to reorder</Text>
      </View>
    </View>
  );
}

function SyncIllustration({ colors }: { colors: Colors }) {
  return (
    <View style={illStyles.container}>
      <View style={[illStyles.circle, { backgroundColor: colors.accentTint }]}>
        <Svg width={56} height={56} viewBox="0 0 24 24" fill="none">
          <Path
            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M21.015 4.356v4.992"
            stroke={colors.accent}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
      <View style={illStyles.syncDevices}>
        <Text style={[illStyles.deviceLabel, { color: colors.textSecondary }]}>Phone</Text>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Path d="M7.5 21l4.5-4.5 4.5 4.5M7.5 3l4.5 4.5L16.5 3" stroke={colors.accent} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
        <Text style={[illStyles.deviceLabel, { color: colors.textSecondary }]}>Web</Text>
      </View>
    </View>
  );
}

const PAGES: Page[] = [
  {
    title: 'Welcome to Zenmode',
    subtitle: 'A calm, focused task planner.\nLet\'s get you started.',
    illustration: (colors) => <WelcomeIllustration colors={colors} />,
  },
  {
    title: 'Swipe for Quick Actions',
    subtitle: 'Swipe left on a task to snooze, move to tomorrow, or delete.\nSwipe right to move to inbox.',
    illustration: (colors) => <SwipeIllustration colors={colors} />,
  },
  {
    title: 'Drag to Reorder',
    subtitle: 'Long press any task and drag it\nto change its position.',
    illustration: (colors) => <DragIllustration colors={colors} />,
  },
  {
    title: 'Synced Everywhere',
    subtitle: 'Your tasks sync automatically between\nthe app and zenmode.work.',
    illustration: (colors) => <SyncIllustration colors={colors} />,
  },
];

export function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [currentPage, setCurrentPage] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setCurrentPage(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleNext = () => {
    if (currentPage < PAGES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentPage + 1, animated: true });
    } else {
      completeOnboarding();
    }
  };

  const completeOnboarding = () => {
    usePlannerStore.setState({ hasCompletedOnboarding: true });
  };

  const isLast = currentPage === PAGES.length - 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <FlatList
        ref={flatListRef}
        data={PAGES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View style={[styles.page, { width: SCREEN_WIDTH }]}>
            <View style={styles.illustrationArea}>
              {item.illustration(colors)}
            </View>
            <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
          </View>
        )}
      />

      {/* Dots + buttons */}
      <View style={styles.footer}>
        <View style={styles.dots}>
          {PAGES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i === currentPage ? colors.accent : colors.border },
              ]}
            />
          ))}
        </View>

        <View style={styles.buttons}>
          {!isLast && (
            <TouchableOpacity onPress={completeOnboarding} style={styles.skipBtn}>
              <Text style={[styles.skipText, { color: colors.textMuted }]}>Skip</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleNext}
            style={[styles.nextBtn, { backgroundColor: colors.accent }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.nextText, { color: colors.accentText }]}>
              {isLast ? 'Get Started' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const illStyles = StyleSheet.create({
  container: { alignItems: 'center', gap: 12 },
  circle: {
    width: 120, height: 120, borderRadius: 60,
    alignItems: 'center', justifyContent: 'center',
  },
  brand: { fontSize: 22, fontWeight: '600', letterSpacing: 0.5 },
  mockRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: 10, borderWidth: 1,
    width: SCREEN_WIDTH - 80,
  },
  mockCheckbox: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 1.5,
  },
  mockText: { flex: 1, fontSize: 15 },
  arrowRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8,
  },
  arrowLabel: { fontSize: 13, fontWeight: '500' },
  syncDevices: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4,
  },
  deviceLabel: { fontSize: 14, fontWeight: '500' },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  page: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  illustrationArea: {
    marginBottom: 40,
    minHeight: 200,
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 24,
    gap: 20,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  skipBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '500',
  },
  nextBtn: {
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 28,
  },
  nextText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
