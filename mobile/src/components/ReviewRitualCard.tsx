import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { usePlannerStore, selectItemsForDay } from '../store/usePlannerStore';
import { toDayKey } from '../../../shared/lib/dates';
import { addDays } from 'date-fns';
import type { Colors } from '../lib/colors';

interface ReviewRitualCardProps {
  colors: Colors;
  onDismiss: () => void;
}

export function ReviewRitualCard({ colors, onDismiss }: ReviewRitualCardProps) {
  const items = usePlannerStore((s) => s.items);
  const addItem = usePlannerStore((s) => s.addItem);
  const moveItem = usePlannerStore((s) => s.moveItem);
  const reviewRitualHour = usePlannerStore((s) => s.reviewRitualHour);

  const now = new Date();
  const isMorning = now.getHours() < reviewRitualHour;
  const reviewDate = isMorning ? addDays(now, -1) : now;
  const reviewDayKey = toDayKey(reviewDate);
  const tomorrowKey = toDayKey(addDays(now, isMorning ? 0 : 1));

  const dayItems = selectItemsForDay(items, reviewDayKey).filter((i) => i.type === 'task');
  const completedTasks = dayItems.filter((i) => i.completed);
  const incompleteTasks = dayItems.filter((i) => !i.completed);

  const [reflection, setReflection] = useState('');
  const [selectedToMove, setSelectedToMove] = useState<Set<string>>(
    new Set(incompleteTasks.map((i) => i.id))
  );

  const toggleMove = (id: string) => {
    setSelectedToMove((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleComplete = () => {
    // Save review note
    if (reflection.trim()) {
      const noteText = `**Reflection:** ${reflection.trim()} #dailyreview`;
      addItem({ type: 'note' as any, text: noteText, dayKey: reviewDayKey });
    }

    // Move selected incomplete tasks
    for (const id of selectedToMove) {
      moveItem(id, tomorrowKey);
    }

    usePlannerStore.setState({
      lastReviewRitualDate: toDayKey(new Date()),
      reviewRitualSnoozedUntil: null,
    });
    onDismiss();
  };

  const handleSnooze = () => {
    usePlannerStore.setState({
      reviewRitualSnoozedUntil: Date.now() + 60 * 60 * 1000,
    });
    onDismiss();
  };

  const handleSkip = () => {
    usePlannerStore.setState({
      lastReviewRitualDate: toDayKey(new Date()),
      reviewRitualSnoozedUntil: null,
    });
    onDismiss();
  };

  const dayLabel = isMorning ? 'yesterday' : 'today';

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>Daily Review</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        How did {dayLabel} go?
      </Text>

      {/* Completed tasks */}
      {completedTasks.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            COMPLETED ({completedTasks.length})
          </Text>
          {completedTasks.map((item) => (
            <View key={item.id} style={styles.taskRow}>
              <Text style={{ color: '#22C55E', fontSize: 14 }}>{'\u2713'}</Text>
              <Text style={[styles.taskText, { color: colors.textMuted, textDecorationLine: 'line-through' }]} numberOfLines={1}>
                {item.text}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Incomplete tasks to move */}
      {incompleteTasks.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            MOVE TO {isMorning ? 'TODAY' : 'TOMORROW'}?
          </Text>
          {incompleteTasks.map((item) => (
            <Pressable key={item.id} onPress={() => toggleMove(item.id)} style={styles.taskRow}>
              <View style={[
                styles.checkbox,
                { borderColor: colors.border },
                selectedToMove.has(item.id) && { backgroundColor: colors.accent, borderColor: colors.accent },
              ]}>
                {selectedToMove.has(item.id) && (
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{'\u2713'}</Text>
                )}
              </View>
              <Text style={[styles.taskText, { color: colors.text }]} numberOfLines={1}>{item.text}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Reflection */}
      <View style={styles.section}>
        <TextInput
          style={[styles.reflectionInput, { color: colors.text, borderColor: colors.border }]}
          placeholder="Any reflections? (optional)"
          placeholderTextColor={colors.textMuted}
          value={reflection}
          onChangeText={setReflection}
          multiline
          textAlignVertical="top"
        />
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={handleComplete}
          style={[styles.primaryBtn, { backgroundColor: colors.accent }]}
        >
          <Text style={[styles.primaryBtnText, { color: colors.accentText }]}>Done</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSnooze} style={styles.secondaryBtn}>
          <Text style={[styles.secondaryBtnText, { color: colors.textMuted }]}>Snooze 1hr</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSkip} style={styles.secondaryBtn}>
          <Text style={[styles.secondaryBtnText, { color: colors.textMuted }]}>Skip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  section: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskText: {
    flex: 1,
    fontSize: 15,
  },
  reflectionInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 60,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  primaryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryBtn: {
    paddingVertical: 10,
  },
  secondaryBtnText: {
    fontSize: 13,
  },
});
