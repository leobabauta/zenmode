import { View, Text, TouchableOpacity, SectionList, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlannerStore, selectItemsForDay } from '../store/usePlannerStore';
import { toDayKey, formatDayLabel } from '../../shared/lib/dates';
import { addDays, isToday, isTomorrow } from 'date-fns';
import type { PlannerItem } from '../../shared/types';

function TaskRow({ item }: { item: PlannerItem }) {
  const updateItem = usePlannerStore((s) => s.updateItem);

  return (
    <TouchableOpacity
      style={styles.taskRow}
      onPress={() => updateItem(item.id, { completed: !item.completed })}
      activeOpacity={0.6}
    >
      <View style={[styles.checkbox, item.completed && styles.checkboxDone]}>
        {item.completed && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <Text style={[styles.taskText, item.completed && styles.taskTextDone]} numberOfLines={2}>
        {item.text}
      </Text>
      {item.isPriority && <View style={[styles.priorityDot, { backgroundColor: '#ef4444' }]} />}
      {item.isMediumPriority && <View style={[styles.priorityDot, { backgroundColor: '#f59e0b' }]} />}
    </TouchableOpacity>
  );
}

function getDayLabel(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return formatDayLabel(date);
}

export function TimelineScreen() {
  const items = usePlannerStore((s) => s.items);
  const insets = useSafeAreaInsets();

  const today = new Date();
  const sections: { title: string; data: PlannerItem[] }[] = [];

  for (let i = 0; i < 14; i++) {
    const date = addDays(today, i);
    const dayKey = toDayKey(date);
    const dayItems = selectItemsForDay(items, dayKey);
    if (dayItems.length === 0) continue;

    const incomplete = dayItems.filter((item) => !item.completed);
    const completed = dayItems.filter((item) => item.completed);

    sections.push({
      title: getDayLabel(date),
      data: [...incomplete, ...completed],
    });
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Timeline</Text>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{section.title.toUpperCase()}</Text>
          </View>
        )}
        renderItem={({ item }) => <TaskRow item={item} />}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <Text style={styles.empty}>No tasks in the next 14 days.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafaf9' },
  title: { fontSize: 28, fontWeight: '700', color: '#1c1917', paddingHorizontal: 20, paddingTop: 16, marginBottom: 16 },
  list: { paddingHorizontal: 20, paddingBottom: 100 },
  empty: { fontSize: 14, color: '#a8a29e', textAlign: 'center', marginTop: 40 },
  sectionHeader: { paddingTop: 20, paddingBottom: 8 },
  sectionHeaderText: { fontSize: 12, fontWeight: '600', color: '#78716c', letterSpacing: 0.5 },
  taskRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e7e5e4',
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: '#d6d3d1',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  checkboxDone: { backgroundColor: '#a8a29e', borderColor: '#a8a29e' },
  checkmark: { fontSize: 13, color: '#fff', fontWeight: '600' },
  taskText: { flex: 1, fontSize: 15, color: '#1c1917', lineHeight: 21 },
  taskTextDone: { color: '#a8a29e', textDecorationLine: 'line-through' },
  priorityDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
});
