import { useRef } from 'react';
import { Animated, StyleSheet, Text, View, I18nManager } from 'react-native';
import { Swipeable, RectButton } from 'react-native-gesture-handler';

interface SwipeableRowProps {
  children: React.ReactNode;
  onDelete: () => void;
  onSnooze: () => void;
}

export function SwipeableRow({ children, onDelete, onSnooze }: SwipeableRowProps) {
  const swipeableRef = useRef<Swipeable>(null);

  const renderLeftActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
  ) => {
    const scale = dragX.interpolate({
      inputRange: [0, 80],
      outputRange: [0.5, 1],
      extrapolate: 'clamp',
    });
    return (
      <RectButton style={styles.leftAction} onPress={() => {
        onSnooze();
        swipeableRef.current?.close();
      }}>
        <Animated.Text style={[styles.actionIcon, { transform: [{ scale }] }]}>
          💤
        </Animated.Text>
        <Animated.Text style={[styles.actionLabel, styles.snoozeLabel, { transform: [{ scale }] }]}>
          Tomorrow
        </Animated.Text>
      </RectButton>
    );
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0.5],
      extrapolate: 'clamp',
    });
    return (
      <RectButton style={styles.rightAction} onPress={() => {
        onDelete();
        swipeableRef.current?.close();
      }}>
        <Animated.Text style={[styles.actionIcon, { transform: [{ scale }] }]}>
          🗑️
        </Animated.Text>
        <Animated.Text style={[styles.actionLabel, styles.deleteLabel, { transform: [{ scale }] }]}>
          Delete
        </Animated.Text>
      </RectButton>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      leftThreshold={80}
      rightThreshold={80}
      onSwipeableOpen={(direction) => {
        if (direction === 'left') onSnooze();
        else if (direction === 'right') onDelete();
        swipeableRef.current?.close();
      }}
      overshootLeft={false}
      overshootRight={false}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  leftAction: {
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
    width: 90,
    flexDirection: 'column',
  },
  rightAction: {
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 90,
    flexDirection: 'column',
  },
  actionIcon: {
    fontSize: 22,
    marginBottom: 2,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  snoozeLabel: {
    color: '#fff',
  },
  deleteLabel: {
    color: '#fff',
  },
});
