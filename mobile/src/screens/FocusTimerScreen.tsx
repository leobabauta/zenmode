import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useColors } from '../lib/colors';

type TimerState = 'idle' | 'running' | 'paused';

const DURATION_PRESETS = [15, 25, 45];

export function FocusTimerScreen() {
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [completed, setCompleted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const colors = useColors();

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

  const formatTime = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePrimaryPress = () => {
    switch (timerState) {
      case 'idle':
        startTimer();
        break;
      case 'running':
        pauseTimer();
        break;
      case 'paused':
        resumeTimer();
        break;
    }
  };

  const primaryLabel = timerState === 'idle' ? 'Start' : timerState === 'running' ? 'Pause' : 'Resume';

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.text }]}>Focus</Text>

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

      <View style={[styles.timerCircle, { borderColor: colors.accent }]}>
        {completed ? (
          <Text style={[styles.completedText, { color: colors.text }]}>Time's up!</Text>
        ) : (
          <Text style={[styles.timerText, { color: colors.text }]}>{formatTime(remainingSeconds)}</Text>
        )}
      </View>

      <View style={styles.buttonsRow}>
        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.accent }]} onPress={handlePrimaryPress}>
          <Text style={[styles.primaryButtonText, { color: colors.accentText }]}>{primaryLabel}</Text>
        </TouchableOpacity>

        {timerState !== 'idle' && (
          <TouchableOpacity style={[styles.secondaryButton, { borderColor: colors.accent }]} onPress={resetTimer}>
            <Text style={[styles.secondaryButtonText, { color: colors.accent }]}>Reset</Text>
          </TouchableOpacity>
        )}

        {completed && (
          <TouchableOpacity style={[styles.secondaryButton, { borderColor: colors.accent }]} onPress={resetTimer}>
            <Text style={[styles.secondaryButtonText, { color: colors.accent }]}>Reset</Text>
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
  title: { fontSize: 28, fontWeight: '700', marginBottom: 32 },
  presetsRow: { flexDirection: 'row', gap: 10, marginBottom: 32 },
  presetPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  presetText: { fontSize: 14, fontWeight: '500' },
  timerCircle: {
    width: 200, height: 200, borderRadius: 100, borderWidth: 4,
    alignItems: 'center', justifyContent: 'center', marginBottom: 40,
  },
  timerText: { fontSize: 40, fontWeight: '300' },
  completedText: { fontSize: 22, fontWeight: '600' },
  buttonsRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  primaryButton: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 28 },
  primaryButtonText: { fontSize: 16, fontWeight: '600' },
  secondaryButton: { borderWidth: 1.5, paddingHorizontal: 24, paddingVertical: 13, borderRadius: 28 },
  secondaryButtonText: { fontSize: 16, fontWeight: '600' },
});
