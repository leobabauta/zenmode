import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { usePlannerStore, selectItemsForDay, selectInboxItems } from '../store/usePlannerStore';
import { toDayKey } from '../../../shared/lib/dates';
import type { Colors } from '../lib/colors';
import type { PlannerItem } from '../../../shared/types';

interface PlanningRitualCardProps {
  colors: Colors;
  onDismiss: () => void;
}

export function PlanningRitualCard({ colors, onDismiss }: PlanningRitualCardProps) {
  const items = usePlannerStore((s) => s.items);
  const updateItem = usePlannerStore((s) => s.updateItem);
  const moveItem = usePlannerStore((s) => s.moveItem);
  const todayKey = toDayKey(new Date());
  const todayItems = selectItemsForDay(items, todayKey).filter((i) => i.type === 'task');
  const inboxItems = selectInboxItems(items).filter((i) => i.type === 'task').slice(0, 5);

  const [movedIds, setMovedIds] = useState<Set<string>>(new Set());

  const handleMoveToToday = (item: PlannerItem) => {
    moveItem(item.id, todayKey);
    setMovedIds((prev) => new Set(prev).add(item.id));
  };

  const handleTogglePriority = (item: PlannerItem) => {
    if (item.isPriority) {
      updateItem(item.id, { isPriority: false, isMediumPriority: false });
    } else if (item.isMediumPriority) {
      updateItem(item.id, { isPriority: true, isMediumPriority: false });
    } else {
      updateItem(item.id, { isPriority: false, isMediumPriority: true });
    }
  };

  const handleComplete = () => {
    usePlannerStore.setState({
      lastRitualDate: todayKey,
      planningRitualSnoozedUntil: null,
    });
    onDismiss();
  };

  const handleSnooze = () => {
    usePlannerStore.setState({
      planningRitualSnoozedUntil: Date.now() + 60 * 60 * 1000,
    });
    onDismiss();
  };

  const handleSkip = () => {
    usePlannerStore.setState({
      lastRitualDate: todayKey,
      planningRitualSnoozedUntil: null,
    });
    onDismiss();
  };

  const visibleInbox = inboxItems.filter((i) => !movedIds.has(i.id));

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>Plan your day</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        What matters most today? Tap stars to set priorities.
      </Text>

      {/* Today's tasks with priority toggles */}
      {todayItems.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>TODAY</Text>
          {todayItems.map((item) => (
            <View key={item.id} style={styles.taskRow}>
              <Pressable onPress={() => handleTogglePriority(item)} style={styles.starBtn}>
                <Text style={{
                  fontSize: 16,
                  color: item.isPriority ? '#FBBF24' : item.isMediumPriority ? '#60A5FA' : colors.border,
                }}>
                  {item.isPriority || item.isMediumPriority ? '\u2605' : '\u2606'}
                </Text>
              </Pressable>
              <Text style={[styles.taskText, { color: colors.text }]} numberOfLines={1}>{item.text}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Inbox items to pull in */}
      {visibleInbox.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>FROM INBOX</Text>
          {visibleInbox.map((item) => (
            <View key={item.id} style={styles.taskRow}>
              <TouchableOpacity
                onPress={() => handleMoveToToday(item)}
                style={[styles.addBtn, { borderColor: colors.accent }]}
              >
                <Text style={{ color: colors.accent, fontSize: 14, fontWeight: '700' }}>+</Text>
              </TouchableOpacity>
              <Text style={[styles.taskText, { color: colors.textMuted }]} numberOfLines={1}>{item.text}</Text>
            </View>
          ))}
        </View>
      )}

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
    paddingVertical: 6,
    gap: 10,
  },
  starBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskText: {
    flex: 1,
    fontSize: 15,
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
