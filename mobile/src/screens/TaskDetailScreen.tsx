import { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { usePlannerStore } from '../store/usePlannerStore';
import { Checkbox } from '../components/Checkbox';
import { PriorityStar } from '../components/PriorityStar';
import { useColors } from '../lib/colors';
import type { PlannerItem } from '../../../shared/types';
import Svg, { Path, Circle as SvgCircle, Line } from 'react-native-svg';

// --- Inline Focus Timer (analog clock style) ---
type TimerState = 'idle' | 'running' | 'paused';
const DURATION_PRESETS = [15, 25, 45];
const DIAL_SIZE = 180;
const DIAL_CX = DIAL_SIZE / 2;
const DIAL_CY = DIAL_SIZE / 2;
const INNER_R = 50;
const TICK_R = 66;
const TICK_OUTER = TICK_R + 8;
const TICK_INNER_MAJOR = TICK_R - 4;
const TICK_INNER_MINOR = TICK_R;
const NEEDLE_LEN = INNER_R + 12;

function inlinePieWedge(endAngleDeg: number, r: number): string {
  if (endAngleDeg <= -90) return '';
  const sweepDeg = endAngleDeg - (-90);
  if (sweepDeg <= 0) return '';
  const largeArc = sweepDeg > 180 ? 1 : 0;
  const endR = (endAngleDeg * Math.PI) / 180;
  return `M ${DIAL_CX} ${DIAL_CY} L ${DIAL_CX} ${DIAL_CY - r} A ${r} ${r} 0 ${largeArc} 1 ${DIAL_CX + r * Math.cos(endR)} ${DIAL_CY + r * Math.sin(endR)} Z`;
}

const INLINE_TICKS = (() => {
  const ticks = [];
  for (let i = 0; i < 60; i++) {
    const angle = (i / 60) * 360 - 90;
    const rad = (angle * Math.PI) / 180;
    const isMajor = i % 5 === 0;
    const inner = isMajor ? TICK_INNER_MAJOR : TICK_INNER_MINOR;
    ticks.push({
      x1: DIAL_CX + inner * Math.cos(rad), y1: DIAL_CY + inner * Math.sin(rad),
      x2: DIAL_CX + TICK_OUTER * Math.cos(rad), y2: DIAL_CY + TICK_OUTER * Math.sin(rad),
      isMajor,
    });
  }
  return ticks;
})();

function InlineFocusTimer({ colors, onComplete }: { colors: any; onComplete: () => void }) {
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [completed, setCompleted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const remainingMinutes = remainingSeconds / 60;
  const handAngleDeg = -90 + remainingMinutes * 6;
  const handRad = (handAngleDeg * Math.PI) / 180;
  const darkPiePath = inlinePieWedge(handAngleDeg, INNER_R);

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

      {/* Analog clock dial */}
      <View style={timerStyles.dialWrapper}>
        <Svg width={DIAL_SIZE} height={DIAL_SIZE} viewBox={`0 0 ${DIAL_SIZE} ${DIAL_SIZE}`}>
          <SvgCircle cx={DIAL_CX} cy={DIAL_CY} r={INNER_R} fill={colors.accentTint} opacity={0.5} />
          {darkPiePath ? <Path d={darkPiePath} fill={colors.accent} opacity={0.55} /> : null}
          {INLINE_TICKS.map((t, i) => (
            <Line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
              stroke={colors.textMuted} strokeWidth={t.isMajor ? 2 : 1} opacity={t.isMajor ? 0.5 : 0.25} />
          ))}
          <Line x1={DIAL_CX} y1={DIAL_CY}
            x2={DIAL_CX + NEEDLE_LEN * Math.cos(handRad)} y2={DIAL_CY + NEEDLE_LEN * Math.sin(handRad)}
            stroke={colors.accent} strokeWidth={6} strokeLinecap="round" />
          <SvgCircle cx={DIAL_CX} cy={DIAL_CY} r={6} fill="white" stroke={colors.accentTint} strokeWidth={1} />
        </Svg>
      </View>

      {/* Time display below dial */}
      {completed ? (
        <View style={timerStyles.completedArea}>
          <Text style={[timerStyles.completedText, { color: colors.text }]}>Done!</Text>
          <Text style={timerStyles.confettiEmoji}>🎊</Text>
        </View>
      ) : (
        <Text style={[timerStyles.timeDisplay, { color: colors.textMuted }]}>{formatTime(remainingSeconds)}</Text>
      )}

      {/* Buttons */}
      <View style={timerStyles.buttonsRow}>
        {timerState === 'idle' && !completed && (
          <TouchableOpacity style={[timerStyles.primaryBtn, { backgroundColor: colors.accent }]} onPress={startTimer}>
            <Text style={[timerStyles.primaryBtnText, { color: colors.accentText }]}>START</Text>
          </TouchableOpacity>
        )}
        {timerState === 'running' && (
          <>
            <TouchableOpacity style={[timerStyles.primaryBtn, { backgroundColor: colors.accent }]} onPress={pauseTimer}>
              <Text style={[timerStyles.primaryBtnText, { color: colors.accentText }]}>PAUSE</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[timerStyles.completeBtn]} onPress={onComplete}>
              <Text style={timerStyles.completeBtnText}>COMPLETE</Text>
            </TouchableOpacity>
          </>
        )}
        {timerState === 'paused' && (
          <>
            <TouchableOpacity style={[timerStyles.primaryBtn, { backgroundColor: colors.accent }]} onPress={resumeTimer}>
              <Text style={[timerStyles.primaryBtnText, { color: colors.accentText }]}>RESUME</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[timerStyles.completeBtn]} onPress={onComplete}>
              <Text style={timerStyles.completeBtnText}>COMPLETE</Text>
            </TouchableOpacity>
          </>
        )}
        {completed && (
          <>
            <TouchableOpacity style={[timerStyles.primaryBtn, { backgroundColor: colors.accent }]} onPress={onComplete}>
              <Text style={[timerStyles.primaryBtnText, { color: colors.accentText }]}>COMPLETE TASK</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[timerStyles.resetBtn, { borderColor: colors.border }]} onPress={resetTimer}>
              <Text style={[timerStyles.resetBtnText, { color: colors.textMuted }]}>Reset</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const timerStyles = StyleSheet.create({
  container: { alignItems: 'center', paddingTop: 16, paddingBottom: 24 },
  presetsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  presetPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  presetText: { fontSize: 14, fontWeight: '500' },
  dialWrapper: { width: DIAL_SIZE, height: DIAL_SIZE, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  completedArea: { alignItems: 'center', marginBottom: 16 },
  completedText: { fontSize: 20, fontWeight: '600' },
  confettiEmoji: { fontSize: 28, marginTop: 4 },
  timeDisplay: { fontSize: 20, fontWeight: '300', letterSpacing: 3, marginBottom: 20 },
  buttonsRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  primaryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 24 },
  primaryBtnText: { fontSize: 13, fontWeight: '700', letterSpacing: 1.5 },
  completeBtn: { backgroundColor: '#059669', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 24 },
  completeBtnText: { fontSize: 13, fontWeight: '700', letterSpacing: 1.5, color: '#fff' },
  resetBtn: { borderWidth: 1.5, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 24 },
  resetBtnText: { fontSize: 13, fontWeight: '500' },
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

  const isReviewNote = item?.type === 'note' && (item.text.includes('#dailyreview') || item.text.includes('#weeklyreview'));

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
        {isReviewNote ? (
          /* Review note display — no checkbox, priority, or timer */
          <View style={styles.reviewDetailCard}>
            <View style={styles.reviewDetailHeader}>
              <Text style={styles.reviewDetailStar}>★</Text>
              <Text style={styles.reviewDetailLabel}>
                {item.text.includes('#weeklyreview') ? 'Weekly Review' : 'Daily Review'}
              </Text>
            </View>
            {item.text.split('\n').filter((line: string) => !line.startsWith('#')).map((line: string, i: number) => {
              const parts = line.split(/(\*\*.*?\*\*)/);
              return (
                <Text key={i} style={styles.reviewDetailText}>
                  {parts.map((part: string, j: number) =>
                    part.startsWith('**') && part.endsWith('**')
                      ? <Text key={j} style={{ fontWeight: '700' }}>{part.slice(2, -2)}</Text>
                      : part
                  )}
                </Text>
              );
            })}
          </View>
        ) : (
          <>
            {/* Checkbox + title + priority */}
            <View style={styles.taskHeader}>
              {item.type === 'task' && (
                <Checkbox
                  checked={!!item.completed}
                  onChange={(checked) => updateItem(item.id, { completed: checked })}
                  colors={colors}
                />
              )}
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
              {item.type === 'task' && (
                <TouchableOpacity onPress={cyclePriority} style={styles.priorityButton}>
                  <PriorityStar isPriority={item.isPriority} isMediumPriority={item.isMediumPriority} colors={colors} />
                </TouchableOpacity>
              )}
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

            {/* Focus Timer — inline (tasks only) */}
            {item.type === 'task' && (
              showTimer ? (
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
              )
            )}
          </>
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
  reviewDetailCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 18,
    marginTop: 12,
  },
  reviewDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  reviewDetailStar: { fontSize: 14, color: '#92400E' },
  reviewDetailLabel: { fontSize: 13, fontWeight: '700', color: '#92400E', textTransform: 'uppercase', letterSpacing: 0.5 },
  reviewDetailText: { fontSize: 15, lineHeight: 22, color: '#78350F', marginBottom: 2 },
});
