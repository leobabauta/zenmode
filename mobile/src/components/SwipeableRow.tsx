import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

interface SwipeableRowProps {
  children: React.ReactNode;
  onDelete: () => void;
  onSnooze: () => void;
  onMoveToInbox?: () => void;
  enabled?: boolean;
}

const SNOOZE_THRESHOLD = 80;
const INBOX_THRESHOLD = 160;
const DELETE_THRESHOLD = 80;

// Clock icon (Heroicon outline)
function ClockIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Inbox icon (Heroicon outline)
function InboxIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Trash icon (Heroicon outline)
function TrashIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function SwipeableRow({ children, onDelete, onSnooze, onMoveToInbox, enabled = true }: SwipeableRowProps) {
  const translateX = useSharedValue(0);
  const isInboxZone = useSharedValue(false);

  const panGesture = Gesture.Pan()
    .enabled(enabled)
    .activeOffsetX([-10, 10])
    .failOffsetY([-20, 20])
    .onUpdate((event) => {
      'worklet';
      const maxRight = onMoveToInbox ? 200 : 120;
      translateX.value = Math.max(-120, Math.min(maxRight, event.translationX));
      isInboxZone.value = onMoveToInbox ? event.translationX > INBOX_THRESHOLD : false;
    })
    .onEnd((event) => {
      'worklet';
      if (onMoveToInbox && event.translationX > INBOX_THRESHOLD) {
        translateX.value = withTiming(400, { duration: 200 }, () => {
          runOnJS(onMoveToInbox)();
          translateX.value = 0;
        });
      } else if (event.translationX > SNOOZE_THRESHOLD) {
        translateX.value = withTiming(400, { duration: 200 }, () => {
          runOnJS(onSnooze)();
          translateX.value = 0;
        });
      } else if (event.translationX < -DELETE_THRESHOLD) {
        translateX.value = withTiming(-400, { duration: 200 }, () => {
          runOnJS(onDelete)();
          translateX.value = 0;
        });
      } else {
        translateX.value = withTiming(0, { duration: 150 });
      }
    });

  const foregroundStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const leftActionStyle = useAnimatedStyle(() => {
    'worklet';
    const show = translateX.value > 5;
    return {
      opacity: show ? 1 : 0,
      width: Math.max(0, translateX.value),
    };
  });

  const leftBgStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      backgroundColor: isInboxZone.value ? '#6b8aad' : '#5a9e72',
    };
  });

  const rightActionStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: translateX.value < -5 ? 1 : 0,
      width: Math.max(0, -translateX.value),
    };
  });

  return (
    <View style={styles.container}>
      {/* Left action (snooze / inbox) */}
      <Animated.View style={[styles.leftAction, leftActionStyle, leftBgStyle]}>
        <LeftActionContent isInboxZone={isInboxZone} hasInbox={!!onMoveToInbox} />
      </Animated.View>

      {/* Right action (delete) */}
      <Animated.View style={[styles.rightAction, rightActionStyle]}>
        <TrashIcon />
        <Text style={styles.actionLabel}>Delete</Text>
      </Animated.View>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={foregroundStyle}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

// Separate component to reactively switch icons based on shared value
function LeftActionContent({ isInboxZone, hasInbox }: { isInboxZone: { value: boolean }; hasInbox: boolean }) {
  return (
    <View style={styles.actionContent}>
      {hasInbox ? (
        <LeftActionDynamic isInboxZone={isInboxZone} />
      ) : (
        <>
          <ClockIcon />
          <Text style={styles.actionLabel}>Tomorrow</Text>
        </>
      )}
    </View>
  );
}

function LeftActionDynamic({ isInboxZone }: { isInboxZone: { value: boolean } }) {
  const snoozeStyle = useAnimatedStyle(() => {
    'worklet';
    return { opacity: isInboxZone.value ? 0 : 1, position: 'absolute' as const };
  });
  const inboxStyle = useAnimatedStyle(() => {
    'worklet';
    return { opacity: isInboxZone.value ? 1 : 0, position: 'absolute' as const };
  });

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', minWidth: 80 }}>
      <Animated.View style={[{ alignItems: 'center' }, snoozeStyle]}>
        <ClockIcon />
        <Text style={styles.actionLabel}>Tomorrow</Text>
      </Animated.View>
      <Animated.View style={[{ alignItems: 'center' }, inboxStyle]}>
        <InboxIcon />
        <Text style={styles.actionLabel}>Inbox</Text>
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
    backgroundColor: '#c05050', justifyContent: 'center', alignItems: 'center',
    flexDirection: 'column', overflow: 'hidden',
  },
  actionContent: {
    alignItems: 'center', justifyContent: 'center',
  },
  actionLabel: { fontSize: 11, fontWeight: '600', color: '#fff', marginTop: 2 },
});
