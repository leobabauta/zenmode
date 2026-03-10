import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Svg, { Circle as SvgCircle, Path } from 'react-native-svg';
import { useColors } from '../lib/colors';

type TimerState = 'idle' | 'running' | 'paused';

const DURATION_PRESETS = [15, 25, 45];
const CIRCLE_SIZE = 220;
const RADIUS = CIRCLE_SIZE / 2;
const CENTER = CIRCLE_SIZE / 2;

// Build an SVG pie wedge. When cutout=true, draws from top clockwise for the elapsed portion.
function describeArc(fraction: number, cutout = false): string {
  if (fraction <= 0) return '';
  if (fraction >= 1) {
    const r = RADIUS + 1;
    return `M ${CENTER} ${CENTER - r} A ${r} ${r} 0 1 0 ${CENTER + 0.001} ${CENTER - r} L ${CENTER} ${CENTER} Z`;
  }

  // Counterclockwise: sweep from top going left
  const angle = fraction * 2 * Math.PI;
  const endX = CENTER - RADIUS * Math.sin(angle);
  const endY = CENTER - RADIUS * Math.cos(angle);
  const largeArc = fraction > 0.5 ? 1 : 0;

  return `M ${CENTER} ${CENTER} L ${CENTER} ${CENTER - RADIUS} A ${RADIUS} ${RADIUS} 0 ${largeArc} 0 ${endX} ${endY} Z`;
}

export function FocusTimerScreen() {
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [completed, setCompleted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const totalSeconds = durationMinutes * 60;
  const fraction = totalSeconds > 0 ? remainingSeconds / totalSeconds : 1;

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const startTimer = useCallback(() => {
    setCompleted(false);
    setTimerState('running');
    intervalRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearTimer();
          setTimerState('idle');
          setCompleted(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearTimer]);

  const pauseTimer = useCallback(() => {
    clearTimer();
    setTimerState('paused');
  }, [clearTimer]);

  const resumeTimer = useCallback(() => {
    startTimer();
  }, [startTimer]);

  const completeEarly = useCallback(() => {
    clearTimer();
    setTimerState('idle');
    setCompleted(true);
    setRemainingSeconds(0);
  }, [clearTimer]);

  const resetTimer = useCallback(() => {
    clearTimer();
    setTimerState('idle');
    setCompleted(false);
    setRemainingSeconds(durationMinutes * 60);
  }, [clearTimer, durationMinutes]);

  const selectDuration = useCallback((minutes: number) => {
    setDurationMinutes(minutes);
    setRemainingSeconds(minutes * 60);
    setCompleted(false);
  }, []);

  const formatTime = (secs: number): string => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isActive = timerState === 'running' || timerState === 'paused';

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={[styles.backText, { color: colors.accent }]}>← Back</Text>
      </TouchableOpacity>
      <Text style={[styles.title, { color: colors.text }]}>Focus</Text>

      {/* Duration presets — only when idle and not completed */}
      {timerState === 'idle' && !completed && (
        <View style={styles.presetsRow}>
          {DURATION_PRESETS.map((mins) => (
            <TouchableOpacity
              key={mins}
              style={[
                styles.presetPill,
                { backgroundColor: colors.pill },
                durationMinutes === mins && { backgroundColor: colors.accent },
              ]}
              onPress={() => selectDuration(mins)}
            >
              <Text
                style={[
                  styles.presetText,
                  { color: colors.text },
                  durationMinutes === mins && { color: colors.accentText },
                ]}
              >
                {mins} min
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Timer circle with pie progress */}
      <View style={styles.timerWrapper}>
        <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
          {/* Full filled circle */}
          <SvgCircle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill={colors.accent}
          />
          {/* Pie cutout for elapsed time (bg color) */}
          {fraction < 1 && (
            <Path
              d={describeArc(1 - fraction, true)}
              fill={colors.bg}
            />
          )}
        </Svg>
        {/* Center text overlay */}
        <View style={styles.timerTextOverlay}>
          {completed ? (
            <>
              <Text style={[styles.completedText, { color: colors.text }]}>Congratulations!</Text>
              <Text style={styles.confettiEmoji}>🎊</Text>
            </>
          ) : (
            <Text style={[styles.timerText, { color: fraction > 0.1 ? '#fff' : colors.text }]}>{formatTime(remainingSeconds)}</Text>
          )}
        </View>
      </View>

      {/* Buttons */}
      <View style={styles.buttonsRow}>
        {/* Idle: Start */}
        {timerState === 'idle' && !completed && (
          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.accent }]} onPress={startTimer}>
            <Text style={[styles.primaryButtonText, { color: colors.accentText }]}>Start</Text>
          </TouchableOpacity>
        )}

        {/* Running: Pause + Complete */}
        {timerState === 'running' && (
          <>
            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.accent }]} onPress={pauseTimer}>
              <Text style={[styles.primaryButtonText, { color: colors.accentText }]}>Pause</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryButton, { borderColor: colors.accent }]} onPress={completeEarly}>
              <Text style={[styles.secondaryButtonText, { color: colors.accent }]}>Complete</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Paused: Resume + Complete */}
        {timerState === 'paused' && (
          <>
            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.accent }]} onPress={resumeTimer}>
              <Text style={[styles.primaryButtonText, { color: colors.accentText }]}>Resume</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryButton, { borderColor: colors.accent }]} onPress={completeEarly}>
              <Text style={[styles.secondaryButtonText, { color: colors.accent }]}>Complete</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Completed: Reset */}
        {completed && (
          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.accent }]} onPress={resetTimer}>
            <Text style={[styles.primaryButtonText, { color: colors.accentText }]}>Reset</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24,
  },
  backButton: { alignSelf: 'flex-start', paddingHorizontal: 20, paddingVertical: 12 },
  backText: { fontSize: 16 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 32 },
  presetsRow: { flexDirection: 'row', gap: 10, marginBottom: 32 },
  presetPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  presetText: { fontSize: 14, fontWeight: '500' },
  timerWrapper: {
    width: CIRCLE_SIZE, height: CIRCLE_SIZE,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 40,
  },
  timerTextOverlay: {
    position: 'absolute',
    alignItems: 'center', justifyContent: 'center',
  },
  timerText: { fontSize: 42, fontWeight: '300' },
  completedText: { fontSize: 22, fontWeight: '600' },
  confettiEmoji: { fontSize: 32, marginTop: 4 },
  buttonsRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  primaryButton: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 28 },
  primaryButtonText: { fontSize: 16, fontWeight: '600' },
  secondaryButton: { borderWidth: 1.5, paddingHorizontal: 24, paddingVertical: 13, borderRadius: 28 },
  secondaryButtonText: { fontSize: 16, fontWeight: '600' },
});
