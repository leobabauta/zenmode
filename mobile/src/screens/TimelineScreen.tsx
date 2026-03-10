import { View, Text, SectionList, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { usePlannerStore, selectItemsForDay } from '../store/usePlannerStore';
import { toDayKey, formatDayLabel } from '../../../shared/lib/dates';
import { addDays, isToday, isTomorrow } from 'date-fns';
import type { PlannerItem } from '../../../shared/types';
import { SwipeableRow } from '../components/SwipeableRow';
import { Checkbox } from '../components/Checkbox';
import { PriorityStar } from '../components/PriorityStar';
import { useToast } from '../components/Toast';
import { useColors, type Colors } from '../lib/colors';

function TaskRow({ item, colors, navigation }: { item: PlannerItem; colors: Colors; navigation: any }) {
  const updateItem = usePlannerStore((s) => s.updateItem);
  const deleteItem = usePlannerStore((s) => s.deleteItem);
  const moveItem = usePlannerStore((s) => s.moveItem);
  const addItem = usePlannerStore((s) => s.addItem);
  const { show } = useToast();

  const handleDelete = () => {
    const snapshot = { ...item };
    deleteItem(item.id);
    show('Item deleted', () => {
      addItem({
        type: snapshot.type,
        text: snapshot.text,
        dayKey: snapshot.dayKey ?? null,
        isLater: snapshot.isLater,
        isPriority: snapshot.isPriority,
        isMediumPriority: snapshot.isMediumPriority,
        isPractice: snapshot.isPractice,
      });
    });
  };

  const handleSnooze = () => {
    const tomorrowKey = toDayKey(addDays(new Date(), 1));
    const prevDayKey = item.dayKey;
    const prevIsLater = item.isLater;
    moveItem(item.id, tomorrowKey, false);
    show('Snoozed until tomorrow', () => {
      moveItem(item.id, prevDayKey, prevIsLater);
    });
  };

  const handleMoveToInbox = () => {
    const prevDayKey = item.dayKey;
    const prevIsLater = item.isLater;
    moveItem(item.id, null, false);
    show('Moved to Inbox', () => {
      moveItem(item.id, prevDayKey, prevIsLater);
    });
  };

  return (
    <SwipeableRow
      onDelete={handleDelete}
      onSnooze={handleSnooze}
      onMoveToInbox={handleMoveToInbox}
    >
      <Pressable onPress={() => navigation.navigate('TaskDetail', { itemId: item.id })}>
      <View style={[styles.taskRow, { backgroundColor: colors.bg }]}>
        <Checkbox
          checked={!!item.completed}
          onChange={(checked) => updateItem(item.id, { completed: checked })}
          colors={colors}
        />
        <Text
          style={[
            styles.taskText,
            { color: colors.text },
            item.completed && { color: colors.textMuted, textDecorationLine: 'line-through' },
          ]}
          numberOfLines={2}
        >
          {item.text}
        </Text>
        <PriorityStar
          isPriority={item.isPriority}
          isMediumPriority={item.isMediumPriority}
          colors={colors}
        />
      </View>
      </Pressable>
    </SwipeableRow>
  );
}

function getDayLabel(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return formatDayLabel(date);
}

export function TimelineScreen() {
  const items = usePlannerStore((s) => s.items);
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const colors = useColors();

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
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.text }]}>Timeline</Text>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section }) => (
          <View style={[styles.sectionHeader, { backgroundColor: colors.bg }]}>
            <Text style={[styles.sectionHeaderText, { color: colors.textSecondary }]}>{section.title.toUpperCase()}</Text>
          </View>
        )}
        renderItem={({ item }) => <TaskRow item={item} colors={colors} navigation={navigation} />}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textMuted }]}>No tasks in the next 14 days.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 34, fontWeight: '700', paddingHorizontal: 20, paddingTop: 16, marginBottom: 16 },
  list: { paddingBottom: 100, paddingHorizontal: 12 },
  empty: { fontSize: 14, textAlign: 'center', marginTop: 40 },
  sectionHeader: { paddingTop: 20, paddingBottom: 8, paddingHorizontal: 20 },
  sectionHeaderText: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  taskRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 10, marginVertical: 1,
  },
  taskText: { flex: 1, fontSize: 15, lineHeight: 21 },
});
