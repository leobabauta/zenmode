import { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { usePlannerStore } from '../store/usePlannerStore';
import { Checkbox } from '../components/Checkbox';
import { PriorityStar } from '../components/PriorityStar';
import { useColors } from '../lib/colors';
import type { PlannerItem } from '../../../shared/types';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';

// --- Inline Focus Timer ---
type TimerState = 'idle' | 'running' | 'paused';
const DURATION_PRESETS = [15, 25, 45];
const CIRCLE_SIZE = 180;
const RADIUS = CIRCLE_SIZE / 2;
const CENTER = CIRCLE_SIZE / 2;

function describeArc(fraction: number): string {
  if (fraction <= 0) return '';
  if (fraction >= 1) {
    const r = RADIUS + 1;
    return `M ${CENTER} ${CENTER - r} A ${r} ${r} 0 1 1 ${CENTER - 0.001} ${CENTER - r} L ${CENTER} ${CENTER} Z`;
  }
  const angle = fraction * 2 * Math.PI;
  const endX = CENTER + RADIUS * Math.sin(angle);
  const endY = CENTER - RADIUS * Math.cos(angle);
  const largeArc = fraction > 0.5 ? 1 : 0;
  return `M ${CENTER} ${CENTER} L ${CENTER} ${CENTER - RADIUS} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${endX} ${endY} Z`;
}

function InlineFocusTimer({ colors, onComplete }: { colors: any; onComplete: () => void }) {
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [completed, setCompleted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSeconds = durationMinutes * 60;
  const fraction = totalSeconds > 0 ? remainingSeconds / totalSeconds : 1;

  const clearTimer = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const startTimer = useCallback(() => {
    setCompleted(false);
    setTimerState('running');
    intervalRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) { clearTimer(); setTimerState('idle'); setCompleted(true); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, [clearTimer]);

  const pauseTimer = useCallback(() => { clearTimer(); setTimerState('paused'); }, [clearTimer]);
  const resumeTimer = useCallback(() => { startTimer(); }, [startTimer]);

  const completeEarly = useCallback(() => {
    clearTimer(); setTimerState('idle'); setCompleted(true); setRemainingSeconds(0);
  }, [clearTimer]);

  const resetTimer = useCallback(() => {
    clearTimer(); setTimerState('idle'); setCompleted(false); setRemainingSeconds(durationMinutes * 60);
  }, [clearTimer, durationMinutes]);

  const selectDuration = useCallback((minutes: number) => {
    setDurationMinutes(minutes); setRemainingSeconds(minutes * 60); setCompleted(false);
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60); const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <View style={timerStyles.container}>
      {/* Duration presets */}
      {timerState === 'idle' && !completed && (
        <View style={timerStyles.presetsRow}>
          {DURATION_PRESETS.map((mins) => (
            <TouchableOpacity
              key={mins}
              style={[timerStyles.presetPill, { backgroundColor: colors.pill }, durationMinutes === mins && { backgroundColor: colors.accent }]}
              onPress={() => selectDuration(mins)}
            >
              <Text style={[timerStyles.presetText, { color: colors.text }, durationMinutes === mins && { color: colors.accentText }]}>{mins} min</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Timer circle */}
      <View style={timerStyles.timerWrapper}>
        <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
          <SvgCircle cx={CENTER} cy={CENTER} r={RADIUS} fill={colors.accent} />
          {fraction < 1 && <Path d={describeArc(1 - fraction)} fill={colors.bg} />}
        </Svg>
        <View style={timerStyles.timerTextOverlay}>
          {completed ? (
            <>
              <Text style={[timerStyles.completedText, { color: colors.text }]}>Done!</Text>
              <Text style={timerStyles.confettiEmoji}>🎊</Text>
            </>
          ) : (
            <Text style={[timerStyles.timerText, { color: fraction > 0.1 ? '#fff' : colors.text }]}>{formatTime(remainingSeconds)}</Text>
          )}
        </View>
      </View>

      {/* Buttons */}
      <View style={timerStyles.buttonsRow}>
        {timerState === 'idle' && !completed && (
          <TouchableOpacity style={[timerStyles.primaryBtn, { backgroundColor: colors.accent }]} onPress={startTimer}>
            <Text style={[timerStyles.primaryBtnText, { color: colors.accentText }]}>Start</Text>
          </TouchableOpacity>
        )}
        {timerState === 'running' && (
          <>
            <TouchableOpacity style={[timerStyles.primaryBtn, { backgroundColor: colors.accent }]} onPress={pauseTimer}>
              <Text style={[timerStyles.primaryBtnText, { color: colors.accentText }]}>Pause</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[timerStyles.secondaryBtn, { borderColor: colors.accent }]} onPress={onComplete}>
              <Text style={[timerStyles.secondaryBtnText, { color: colors.accent }]}>Complete</Text>
            </TouchableOpacity>
          </>
        )}
        {timerState === 'paused' && (
          <>
            <TouchableOpacity style={[timerStyles.primaryBtn, { backgroundColor: colors.accent }]} onPress={resumeTimer}>
              <Text style={[timerStyles.primaryBtnText, { color: colors.accentText }]}>Resume</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[timerStyles.secondaryBtn, { borderColor: colors.accent }]} onPress={onComplete}>
              <Text style={[timerStyles.secondaryBtnText, { color: colors.accent }]}>Complete</Text>
            </TouchableOpacity>
          </>
        )}
        {completed && (
          <>
            <TouchableOpacity style={[timerStyles.primaryBtn, { backgroundColor: colors.accent }]} onPress={onComplete}>
              <Text style={[timerStyles.primaryBtnText, { color: colors.accentText }]}>Complete Task</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[timerStyles.secondaryBtn, { borderColor: colors.accent }]} onPress={resetTimer}>
              <Text style={[timerStyles.secondaryBtnText, { color: colors.accent }]}>Reset</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const timerStyles = StyleSheet.create({
  container: { alignItems: 'center', paddingTop: 16, paddingBottom: 24 },
  presetsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  presetPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  presetText: { fontSize: 14, fontWeight: '500' },
  timerWrapper: { width: CIRCLE_SIZE, height: CIRCLE_SIZE, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  timerTextOverlay: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  timerText: { fontSize: 36, fontWeight: '300' },
  completedText: { fontSize: 20, fontWeight: '600' },
  confettiEmoji: { fontSize: 28, marginTop: 4 },
  buttonsRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  primaryBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24 },
  primaryBtnText: { fontSize: 15, fontWeight: '600' },
  secondaryBtn: { borderWidth: 1.5, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 24 },
  secondaryBtnText: { fontSize: 15, fontWeight: '600' },
});

// --- Task Detail Screen ---
export function TaskDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { itemId } = route.params;

  const item = usePlannerStore((s) => s.items[itemId]);
  const updateItem = usePlannerStore((s) => s.updateItem);

  const [editingTitle, setEditingTitle] = useState(false);
  const [editText, setEditText] = useState(item?.text ?? '');
  const [notesText, setNotesText] = useState(item?.notes ?? '');
  const [editingNotes, setEditingNotes] = useState(false);
  const [showTimer, setShowTimer] = useState(false);

  if (!item) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={[styles.backText, { color: colors.accent }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.notFound, { color: colors.textMuted }]}>Task not found.</Text>
      </View>
    );
  }

  const commitTitle = () => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== item.text) updateItem(item.id, { text: trimmed });
    else setEditText(item.text);
    setEditingTitle(false);
  };

  const commitNotes = () => {
    const trimmed = notesText.trim();
    if (trimmed !== (item.notes ?? '')) updateItem(item.id, { notes: trimmed || undefined });
    setEditingNotes(false);
  };

  const cyclePriority = () => {
    if (!item.isPriority && !item.isMediumPriority) {
      updateItem(item.id, { isMediumPriority: true, isPriority: false });
    } else if (item.isMediumPriority) {
      updateItem(item.id, { isMediumPriority: false, isPriority: true });
    } else {
      updateItem(item.id, { isMediumPriority: false, isPriority: false });
    }
  };

  const handleCompleteTask = () => {
    updateItem(item.id, { completed: true });
    setShowTimer(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={[styles.backText, { color: colors.accent }]}>← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Checkbox + title + priority */}
        <View style={styles.taskHeader}>
          <Checkbox
            checked={!!item.completed}
            onChange={(checked) => updateItem(item.id, { completed: checked })}
            colors={colors}
          />
          {editingTitle ? (
            <TextInput
              style={[styles.titleInput, { color: colors.text }]}
              value={editText}
              onChangeText={setEditText}
              onBlur={commitTitle}
              onSubmitEditing={commitTitle}
              autoFocus
              multiline
            />
          ) : (
            <TouchableOpacity style={{ flex: 1 }} onPress={() => { setEditText(item.text); setEditingTitle(true); }}>
              <Text style={[styles.taskText, { color: colors.text }, item.completed && { color: colors.textMuted, textDecorationLine: 'line-through' }]}>
                {item.text}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={cyclePriority} style={styles.priorityButton}>
            <PriorityStar isPriority={item.isPriority} isMediumPriority={item.isMediumPriority} colors={colors} />
          </TouchableOpacity>
        </View>

        {/* Notes */}
        <View style={[styles.notesSection, { borderTopColor: colors.border }]}>
          <Text style={[styles.notesLabel, { color: colors.textMuted }]}>Notes</Text>
          {editingNotes ? (
            <TextInput
              style={[styles.notesInput, { color: colors.text, borderColor: colors.border }]}
              value={notesText}
              onChangeText={setNotesText}
              onBlur={commitNotes}
              autoFocus
              multiline
              placeholder="Add a note..."
              placeholderTextColor={colors.textMuted}
              textAlignVertical="top"
            />
          ) : (
            <TouchableOpacity onPress={() => { setNotesText(item.notes ?? ''); setEditingNotes(true); }} style={styles.notesTouchable}>
              {item.notes ? (
                <Text style={[styles.notesText, { color: colors.text }]}>{item.notes}</Text>
              ) : (
                <Text style={[styles.notesPlaceholder, { color: colors.textMuted }]}>Tap to add a note...</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Focus Timer — inline */}
        {showTimer ? (
          <View style={[styles.timerSection, { borderTopColor: colors.border }]}>
            <InlineFocusTimer colors={colors} onComplete={handleCompleteTask} />
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.focusButton, { backgroundColor: colors.accent }]}
            onPress={() => setShowTimer(true)}
          >
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" stroke={colors.accentText} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
            <Text style={[styles.focusButtonText, { color: colors.accentText }]}>Focus</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  backButton: {},
  backText: { fontSize: 16 },
  notFound: { fontSize: 14, textAlign: 'center', marginTop: 40 },
  scrollContent: { flex: 1, paddingHorizontal: 20 },
  taskHeader: { flexDirection: 'row', alignItems: 'flex-start', paddingTop: 12, paddingBottom: 24 },
  taskText: { fontSize: 20, lineHeight: 28, fontWeight: '500' },
  titleInput: { flex: 1, fontSize: 20, lineHeight: 28, fontWeight: '500', padding: 0 },
  priorityButton: { paddingLeft: 8, paddingTop: 2 },
  notesSection: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 16 },
  notesLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  notesTouchable: { minHeight: 60 },
  notesText: { fontSize: 15, lineHeight: 22 },
  notesPlaceholder: { fontSize: 15, fontStyle: 'italic' },
  notesInput: { fontSize: 15, lineHeight: 22, padding: 12, borderWidth: 1, borderRadius: 8, minHeight: 120 },
  timerSection: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 16, paddingTop: 8 },
  focusButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start',
    gap: 8, marginTop: 24, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 24,
  },
  focusButtonText: { fontSize: 15, fontWeight: '600' },
});
