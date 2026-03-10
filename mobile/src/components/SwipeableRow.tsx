import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

interface SwipeableRowProps {
  children: React.ReactNode;
  onTomorrow?: () => void;
  onSnooze?: () => void;
  onMoveToInbox?: () => void;
  onDelete?: () => void;
  enabled?: boolean;
}

const SHORT_THRESHOLD = 80;
const LONG_THRESHOLD = 160;

// Clock icon
function ClockIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Calendar icon (for snooze)
function CalendarIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Inbox icon
function InboxIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Trash icon
function TrashIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function SwipeableRow({ children, onTomorrow, onSnooze, onMoveToInbox, onDelete, enabled = true }: SwipeableRowProps) {
  const translateX = useSharedValue(0);
  // 0 = none, 1 = tomorrow (short right), 2 = snooze (long right)
  const rightZone = useSharedValue(0);
  // 0 = none, 1 = inbox (short left), 2 = delete (long left)
  const leftZone = useSharedValue(0);

  const hasRightShort = !!onTomorrow;
  const hasRightLong = !!onSnooze;
  const hasLeftShort = !!onMoveToInbox;
  const hasLeftLong = !!onDelete;

  const maxRight = hasRightLong ? 220 : (hasRightShort ? 120 : 0);
  const maxLeft = hasLeftLong ? 220 : (hasLeftShort ? 120 : (hasLeftLong ? 120 : 0));

  const panGesture = Gesture.Pan()
    .enabled(enabled)
    .activeOffsetX([-10, 10])
    .failOffsetY([-20, 20])
    .onUpdate((event) => {
      'worklet';
      translateX.value = Math.max(-maxLeft, Math.min(maxRight, event.translationX));

      // Right zones
      if (event.translationX > 0) {
        if (hasRightLong && event.translationX > LONG_THRESHOLD) {
          rightZone.value = 2;
        } else if (hasRightShort && event.translationX > SHORT_THRESHOLD) {
          rightZone.value = 1;
        } else {
          rightZone.value = 0;
        }
        leftZone.value = 0;
      }
      // Left zones
      else {
        if (hasLeftLong && event.translationX < -LONG_THRESHOLD) {
          leftZone.value = 2;
        } else if (hasLeftShort && event.translationX < -SHORT_THRESHOLD) {
          leftZone.value = 1;
        } else if (!hasLeftShort && hasLeftLong && event.translationX < -SHORT_THRESHOLD) {
          leftZone.value = 2;
        } else {
          leftZone.value = 0;
        }
        rightZone.value = 0;
      }
    })
    .onEnd((event) => {
      'worklet';
      // Right swipe actions
      if (event.translationX > 0) {
        if (hasRightLong && event.translationX > LONG_THRESHOLD && onSnooze) {
          translateX.value = withTiming(400, { duration: 200 }, () => {
            runOnJS(onSnooze)();
            translateX.value = 0;
          });
          return;
        }
        if (hasRightShort && event.translationX > SHORT_THRESHOLD && onTomorrow) {
          translateX.value = withTiming(400, { duration: 200 }, () => {
            runOnJS(onTomorrow)();
            translateX.value = 0;
          });
          return;
        }
      }
      // Left swipe actions
      if (event.translationX < 0) {
        if (hasLeftLong && event.translationX < -LONG_THRESHOLD && onDelete) {
          translateX.value = withTiming(-400, { duration: 200 }, () => {
            runOnJS(onDelete)();
            translateX.value = 0;
          });
          return;
        }
        if (hasLeftShort && event.translationX < -SHORT_THRESHOLD && onMoveToInbox) {
          translateX.value = withTiming(-400, { duration: 200 }, () => {
            runOnJS(onMoveToInbox)();
            translateX.value = 0;
          });
          return;
        }
        // If no short left but has long left, trigger delete at short threshold
        if (!hasLeftShort && hasLeftLong && event.translationX < -SHORT_THRESHOLD && onDelete) {
          translateX.value = withTiming(-400, { duration: 200 }, () => {
            runOnJS(onDelete)();
            translateX.value = 0;
          });
          return;
        }
      }
      // Snap back
      translateX.value = withTiming(0, { duration: 150 });
    });

  const foregroundStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const leftActionStyle = useAnimatedStyle(() => ({
    opacity: translateX.value > 5 ? 1 : 0,
    width: Math.max(0, translateX.value),
  }));

  const leftBgStyle = useAnimatedStyle(() => ({
    backgroundColor: rightZone.value === 2 ? '#5a7e9e' : '#5a9e72',
  }));

  const rightActionStyle = useAnimatedStyle(() => ({
    opacity: translateX.value < -5 ? 1 : 0,
    width: Math.max(0, -translateX.value),
  }));

  const rightBgStyle = useAnimatedStyle(() => ({
    backgroundColor: leftZone.value === 2 ? '#c05050' : '#6b8aad',
  }));

  return (
    <View style={styles.container}>
      {/* Right swipe actions (Tomorrow / Snooze) */}
      <Animated.View style={[styles.leftAction, leftActionStyle, leftBgStyle]}>
        <RightSwipeContent rightZone={rightZone} hasLong={hasRightLong} />
      </Animated.View>

      {/* Left swipe actions (Inbox / Delete) */}
      <Animated.View style={[styles.rightAction, rightActionStyle, rightBgStyle]}>
        <LeftSwipeContent leftZone={leftZone} hasShort={hasLeftShort} />
      </Animated.View>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={foregroundStyle}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

function RightSwipeContent({ rightZone, hasLong }: { rightZone: { value: number }; hasLong: boolean }) {
  if (!hasLong) {
    return (
      <View style={styles.actionContent}>
        <ClockIcon />
        <Text style={styles.actionLabel}>Tomorrow</Text>
      </View>
    );
  }

  const tomorrowStyle = useAnimatedStyle(() => ({
    opacity: rightZone.value === 2 ? 0 : 1,
    position: 'absolute' as const,
  }));
  const snoozeStyle = useAnimatedStyle(() => ({
    opacity: rightZone.value === 2 ? 1 : 0,
    position: 'absolute' as const,
  }));

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', minWidth: 80 }}>
      <Animated.View style={[{ alignItems: 'center' }, tomorrowStyle]}>
        <ClockIcon />
        <Text style={styles.actionLabel}>Tomorrow</Text>
      </Animated.View>
      <Animated.View style={[{ alignItems: 'center' }, snoozeStyle]}>
        <CalendarIcon />
        <Text style={styles.actionLabel}>Snooze</Text>
      </Animated.View>
    </View>
  );
}

function LeftSwipeContent({ leftZone, hasShort }: { leftZone: { value: number }; hasShort: boolean }) {
  if (!hasShort) {
    return (
      <View style={styles.actionContent}>
        <TrashIcon />
        <Text style={styles.actionLabel}>Delete</Text>
      </View>
    );
  }

  const inboxStyle = useAnimatedStyle(() => ({
    opacity: leftZone.value === 2 ? 0 : 1,
    position: 'absolute' as const,
  }));
  const deleteStyle = useAnimatedStyle(() => ({
    opacity: leftZone.value === 2 ? 1 : 0,
    position: 'absolute' as const,
  }));

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', minWidth: 80 }}>
      <Animated.View style={[{ alignItems: 'center' }, inboxStyle]}>
        <InboxIcon />
        <Text style={styles.actionLabel}>Inbox</Text>
      </Animated.View>
      <Animated.View style={[{ alignItems: 'center' }, deleteStyle]}>
        <TrashIcon />
        <Text style={styles.actionLabel}>Delete</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden' },
  leftAction: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
    flexDirection: 'column', overflow: 'hidden',
  },
  rightAction: {
    position: 'absolute', right: 0, top: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
    flexDirection: 'column', overflow: 'hidden',
  },
  actionContent: {
    alignItems: 'center', justifyContent: 'center',
  },
  actionLabel: { fontSize: 11, fontWeight: '600', color: '#fff', marginTop: 2 },
});
