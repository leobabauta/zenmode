import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

type TimerState = 'idle' | 'running' | 'paused';

const DURATION_PRESETS = [15, 25, 45];

export function FocusTimerScreen() {
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [completed, setCompleted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    <View style={styles.container}>
      <Text style={styles.title}>Focus</Text>

      {timerState === 'idle' && !completed && (
        <View style={styles.presetsRow}>
          {DURATION_PRESETS.map((mins) => (
            <TouchableOpacity
              key={mins}
              style={[
                styles.presetPill,
                durationMinutes === mins && styles.presetPillActive,
              ]}
              onPress={() => selectDuration(mins)}
            >
              <Text
                style={[
                  styles.presetText,
                  durationMinutes === mins && styles.presetTextActive,
                ]}
              >
                {mins} min
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.timerCircle}>
        {completed ? (
          <Text style={styles.completedText}>Time's up!</Text>
        ) : (
          <Text style={styles.timerText}>{formatTime(remainingSeconds)}</Text>
        )}
      </View>

      <View style={styles.buttonsRow}>
        <TouchableOpacity style={styles.primaryButton} onPress={handlePrimaryPress}>
          <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
        </TouchableOpacity>

        {timerState !== 'idle' && (
          <TouchableOpacity style={styles.secondaryButton} onPress={resetTimer}>
            <Text style={styles.secondaryButtonText}>Reset</Text>
          </TouchableOpacity>
        )}

        {completed && (
          <TouchableOpacity style={styles.secondaryButton} onPress={resetTimer}>
            <Text style={styles.secondaryButtonText}>Reset</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf9',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1c1917',
    marginBottom: 32,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 32,
  },
  presetPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f4',
  },
  presetPillActive: {
    backgroundColor: '#1c1917',
  },
  presetText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1c1917',
  },
  presetTextActive: {
    color: '#fff',
  },
  timerCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: '#1c1917',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  timerText: {
    fontSize: 40,
    fontWeight: '300',
    color: '#1c1917',
  },
  completedText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1c1917',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#1c1917',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 28,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: '#1c1917',
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 28,
  },
  secondaryButtonText: {
    color: '#1c1917',
    fontSize: 16,
    fontWeight: '600',
  },
});
