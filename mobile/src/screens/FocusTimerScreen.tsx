import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Svg, { Circle as SvgCircle, Path, Line } from 'react-native-svg';
import { useColors } from '../lib/colors';
import { scheduleFocusTimerNotification, cancelFocusTimerNotification, requestNotificationPermissions } from '../lib/notifications';

type TimerState = 'idle' | 'running' | 'paused';

const DURATION_PRESETS = [15, 25, 45];
const SIZE = 220;
const CX = SIZE / 2;
const CY = SIZE / 2;
const INNER_RADIUS = 62;
const TICK_RADIUS = 82;
const TICK_OUTER = TICK_RADIUS + 10;
const TICK_INNER_MAJOR = TICK_RADIUS - 5;
const TICK_INNER_MINOR = TICK_RADIUS;
const NEEDLE_LENGTH = INNER_RADIUS + 14;

// Pie wedge from 12 o'clock clockwise to endAngleDeg
function pieWedge(endAngleDeg: number, r: number): string {
  if (endAngleDeg <= -90) return '';
  const sweepDeg = endAngleDeg - (-90);
  if (sweepDeg <= 0) return '';
  const largeArc = sweepDeg > 180 ? 1 : 0;
  const endR = (endAngleDeg * Math.PI) / 180;
  return `M ${CX} ${CY} L ${CX} ${CY - r} A ${r} ${r} 0 ${largeArc} 1 ${CX + r * Math.cos(endR)} ${CY + r * Math.sin(endR)} Z`;
}

// Generate 60 tick mark data
function generateTicks() {
  const ticks = [];
  for (let i = 0; i < 60; i++) {
    const angle = (i / 60) * 360 - 90;
    const rad = (angle * Math.PI) / 180;
    const isMajor = i % 5 === 0;
    const inner = isMajor ? TICK_INNER_MAJOR : TICK_INNER_MINOR;
    ticks.push({
      x1: CX + inner * Math.cos(rad),
      y1: CY + inner * Math.sin(rad),
      x2: CX + TICK_OUTER * Math.cos(rad),
      y2: CY + TICK_OUTER * Math.sin(rad),
      isMajor,
    });
  }
  return ticks;
}

const TICKS = generateTicks();

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
    // Schedule notification for when timer ends (in case app is backgrounded)
    setRemainingSeconds((current) => {
      requestNotificationPermissions().then((granted) => {
        if (granted) scheduleFocusTimerNotification(current);
      });
      return current;
    });
    intervalRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearTimer();
          setTimerState('idle');
          setCompleted(true);
          cancelFocusTimerNotification();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearTimer]);

  const pauseTimer = useCallback(() => {
    clearTimer();
    cancelFocusTimerNotification();
    setTimerState('paused');
  }, [clearTimer]);

  const resumeTimer = useCallback(() => {
    startTimer();
  }, [startTimer]);

  const completeEarly = useCallback(() => {
    clearTimer();
    cancelFocusTimerNotification();
    setTimerState('idle');
    setCompleted(true);
    setRemainingSeconds(0);
  }, [clearTimer]);

  const resetTimer = useCallback(() => {
    clearTimer();
    cancelFocusTimerNotification();
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

  // Needle angle: remaining minutes mapped on 60-min dial
  const remainingMinutes = remainingSeconds / 60;
  const handAngleDeg = -90 + remainingMinutes * 6;
  const handRad = (handAngleDeg * Math.PI) / 180;

  // Pie wedge for remaining time
  const darkPiePath = pieWedge(handAngleDeg, INNER_RADIUS);

  // Purple accent versions (matching the app's purple theme)
  const accentDark = colors.accent; // #5B5BD6 light / #7C7CE8 dark
  const accentLight = colors.accentTint; // #F0F0FF light / #1E1E3A dark
  const tickColor = colors.textMuted;

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

      {/* Analog clock dial */}
      <View style={styles.dialWrapper}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {/* Light accent: entire inner circle */}
          <SvgCircle cx={CX} cy={CY} r={INNER_RADIUS} fill={accentLight} opacity={0.5} />

          {/* Dark accent pie: from 12 o'clock to hand (remaining portion) */}
          {darkPiePath ? (
            <Path d={darkPiePath} fill={accentDark} opacity={0.55} />
          ) : null}

          {/* Tick marks */}
          {TICKS.map((t, i) => (
            <Line
              key={i}
              x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
              stroke={tickColor}
              strokeWidth={t.isMajor ? 2 : 1}
              opacity={t.isMajor ? 0.5 : 0.25}
            />
          ))}

          {/* Needle */}
          <Line
            x1={CX} y1={CY}
            x2={CX + NEEDLE_LENGTH * Math.cos(handRad)}
            y2={CY + NEEDLE_LENGTH * Math.sin(handRad)}
            stroke={accentDark}
            strokeWidth={7}
            strokeLinecap="round"
          />

          {/* Center dot */}
          <SvgCircle cx={CX} cy={CY} r={8} fill="white" stroke={accentLight} strokeWidth={1} />
        </Svg>
      </View>

      {/* Time display below the dial */}
      {completed ? (
        <View style={styles.completedArea}>
          <Text style={[styles.completedText, { color: colors.text }]}>Congratulations!</Text>
          <Text style={styles.confettiEmoji}>🎊</Text>
        </View>
      ) : (
        <Text style={[styles.timeDisplay, { color: colors.textMuted }]}>
          {formatTime(remainingSeconds)}
        </Text>
      )}

      {/* Buttons */}
      <View style={styles.buttonsRow}>
        {/* Idle: Start */}
        {timerState === 'idle' && !completed && (
          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: accentDark }]} onPress={startTimer}>
            <Text style={[styles.primaryButtonText, { color: colors.accentText }]}>START</Text>
          </TouchableOpacity>
        )}

        {/* Running: Pause + Complete */}
        {timerState === 'running' && (
          <>
            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: accentDark }]} onPress={pauseTimer}>
              <Text style={[styles.primaryButtonText, { color: colors.accentText }]}>PAUSE</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.completeButton]} onPress={completeEarly}>
              <Text style={styles.completeButtonText}>COMPLETE</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Paused: Resume + Complete + Reset */}
        {timerState === 'paused' && (
          <>
            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: accentDark }]} onPress={resumeTimer}>
              <Text style={[styles.primaryButtonText, { color: colors.accentText }]}>RESUME</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.completeButton]} onPress={completeEarly}>
              <Text style={styles.completeButtonText}>COMPLETE</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.resetButton, { borderColor: colors.border }]} onPress={resetTimer}>
              <Text style={[styles.resetButtonText, { color: colors.textMuted }]}>Reset</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Completed: Restart + Reset */}
        {completed && (
          <>
            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: accentDark }]} onPress={startTimer}>
              <Text style={[styles.primaryButtonText, { color: colors.accentText }]}>RESTART</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.resetButton, { borderColor: colors.border }]} onPress={resetTimer}>
              <Text style={[styles.resetButtonText, { color: colors.textMuted }]}>Reset</Text>
            </TouchableOpacity>
          </>
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
  dialWrapper: {
    width: SIZE, height: SIZE,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  completedArea: { alignItems: 'center', marginBottom: 24 },
  completedText: { fontSize: 22, fontWeight: '600' },
  confettiEmoji: { fontSize: 32, marginTop: 4 },
  timeDisplay: {
    fontSize: 22, fontWeight: '300', letterSpacing: 4, marginBottom: 24,
  },
  buttonsRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  primaryButton: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 28 },
  primaryButtonText: { fontSize: 14, fontWeight: '700', letterSpacing: 1.5 },
  completeButton: {
    backgroundColor: '#059669', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 28,
  },
  completeButtonText: { fontSize: 14, fontWeight: '700', letterSpacing: 1.5, color: '#fff' },
  resetButton: {
    borderWidth: 1.5, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 28,
  },
  resetButtonText: { fontSize: 14, fontWeight: '500' },
});
