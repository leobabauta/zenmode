import { useRef, useState, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Rect, Path, Circle as SvgCircle } from 'react-native-svg';
import { TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay,
  withSequence, runOnJS, Easing,
} from 'react-native-reanimated';
import type { Colors } from '../lib/colors';

const CONFETTI_COLORS = ['#f43f5e', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#f97316'];

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  colors: Colors;
}

interface Particle {
  id: number;
  color: string;
  angle: number;
  distance: number;
  size: number;
}

function ConfettiParticle({ particle }: { particle: Particle }) {
  const opacity = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(0.5);

  const x = Math.cos(particle.angle) * particle.distance;
  const y = Math.sin(particle.angle) * particle.distance;

  // Start animation immediately
  translateX.value = withTiming(x, { duration: 600, easing: Easing.out(Easing.cubic) });
  translateY.value = withTiming(y, { duration: 600, easing: Easing.out(Easing.cubic) });
  scale.value = withSequence(
    withTiming(1.2, { duration: 200 }),
    withTiming(0, { duration: 400 }),
  );
  opacity.value = withDelay(300, withTiming(0, { duration: 300 }));

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[{
        position: 'absolute',
        width: particle.size,
        height: particle.size,
        borderRadius: particle.size / 2,
        backgroundColor: particle.color,
        left: 10 - particle.size / 2,
        top: 10 - particle.size / 2,
      }, style]}
    />
  );
}

export function Checkbox({ checked, onChange, colors }: CheckboxProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const nextId = useRef(0);

  const spawnConfetti = useCallback(() => {
    const count = 8 + Math.floor(Math.random() * 4);
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: nextId.current++,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        angle: (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4,
        distance: 16 + Math.random() * 12,
        size: 3 + Math.random() * 2,
      });
    }
    setParticles(newParticles);
    setTimeout(() => setParticles([]), 800);
  }, []);

  const handlePress = () => {
    if (!checked) {
      spawnConfetti();
      // Small delay before marking complete, like web
      setTimeout(() => onChange(true), 150);
    } else {
      onChange(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity onPress={handlePress} style={styles.hitArea} activeOpacity={0.7}>
        <Svg width={20} height={20} viewBox="0 0 16 16">
          {checked ? (
            <>
              <Rect x="0" y="0" width="16" height="16" rx="3" fill="#22c55e" />
              <Path
                d="M4.5 8.5L6.5 10.5L11.5 5.5"
                stroke="white"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          ) : (
            <Rect
              x="1" y="1" width="14" height="14" rx="3"
              stroke={colors.checkboxBorder}
              strokeWidth={1.5}
              fill="none"
            />
          )}
        </Svg>
      </TouchableOpacity>
      {particles.map((p) => (
        <ConfettiParticle key={p.id} particle={p} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: 20,
    height: 20,
    marginRight: 12,
    overflow: 'visible',
  },
  hitArea: {
    width: 20,
    height: 20,
  },
});
