import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, SectionList, Pressable, TouchableOpacity, StyleSheet, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { usePlannerStore, selectItemsForDay } from '../store/usePlannerStore';
import { toDayKey, formatDayLabel } from '../../../shared/lib/dates';
import { addDays, isToday, isTomorrow } from 'date-fns';
import type { PlannerItem } from '../../../shared/types';
import { SwipeableRow } from '../components/SwipeableRow';
import { Checkbox } from '../components/Checkbox';
import { PriorityStar } from '../components/PriorityStar';
import { SnoozeModal } from '../components/SnoozeModal';
import { useToast } from '../components/Toast';
import { useColors, type Colors } from '../lib/colors';
import Svg, { Path } from 'react-native-svg';

function TaskRow({ item, colors, navigation, onRequestSnooze }: {
  item: PlannerItem; colors: Colors; navigation: any;
  onRequestSnooze: (itemId: string) => void;
}) {
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
        type: snapshot.type, text: snapshot.text, dayKey: snapshot.dayKey ?? null,
        isLater: snapshot.isLater, isPriority: snapshot.isPriority,
        isMediumPriority: snapshot.isMediumPriority, isPractice: snapshot.isPractice,
      });
    });
  };

  const handleTomorrow = () => {
    const tomorrowKey = toDayKey(addDays(new Date(), 1));
    const prevDayKey = item.dayKey;
    const prevIsLater = item.isLater;
    moveItem(item.id, tomorrowKey, false);
    show('Moved to tomorrow', () => { moveItem(item.id, prevDayKey, prevIsLater); });
  };

  const handleMoveToInbox = () => {
    const prevDayKey = item.dayKey;
    const prevIsLater = item.isLater;
    moveItem(item.id, null, false);
    show('Moved to Inbox', () => { moveItem(item.id, prevDayKey, prevIsLater); });
  };

  return (
    <SwipeableRow
      onTomorrow={handleTomorrow}
      onSnooze={() => onRequestSnooze(item.id)}
      onMoveToInbox={handleMoveToInbox}
      onDelete={handleDelete}
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
              styles.taskText, { color: colors.text },
              item.completed && { color: colors.textMuted, textDecorationLine: 'line-through' },
            ]}
            numberOfLines={2}
          >
            {item.text}
          </Text>
          <PriorityStar isPriority={item.isPriority} isMediumPriority={item.isMediumPriority} colors={colors} />
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

interface TimelineSection {
  title: string;
  dayKey: string;
  data: PlannerItem[];
}

function AddTaskRow({ dayKey, colors }: { dayKey: string; colors: Colors }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);
  const addItem = usePlannerStore((s) => s.addItem);

  useEffect(() => {
    if (editing) setTimeout(() => inputRef.current?.focus(), 100);
  }, [editing]);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (trimmed) addItem({ type: 'task', text: trimmed, dayKey });
    setText('');
    setEditing(false);
    Keyboard.dismiss();
  };

  if (editing) {
    return (
      <View style={[styles.addTaskInputRow, { borderColor: colors.border }]}>
        <TextInput
          ref={inputRef}
          style={[styles.addTaskInput, { color: colors.text }]}
          placeholder="Add a task..."
          placeholderTextColor={colors.textMuted}
          value={text}
          onChangeText={setText}
          onSubmitEditing={handleSubmit}
          onBlur={handleSubmit}
          returnKeyType="done"
        />
      </View>
    );
  }

  return (
    <TouchableOpacity style={styles.addTaskRow} onPress={() => setEditing(true)} activeOpacity={0.6}>
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
        <Path d="M12 4.5v15m7.5-7.5h-15" stroke={colors.textMuted} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      <Text style={[styles.addTaskText, { color: colors.textMuted }]}>Add task</Text>
    </TouchableOpacity>
  );
}

export function TimelineScreen() {
  const items = usePlannerStore((s) => s.items);
  const moveItem = usePlannerStore((s) => s.moveItem);
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { show } = useToast();

  const [snoozeItemId, setSnoozeItemId] = useState<string | null>(null);

  const today = new Date();
  const sections: TimelineSection[] = [];

  for (let i = 0; i < 14; i++) {
    const date = addDays(today, i);
    const dayKey = toDayKey(date);
    const dayItems = selectItemsForDay(items, dayKey);

    const incomplete = dayItems.filter((item) => !item.completed);
    const completed = dayItems.filter((item) => item.completed);

    sections.push({
      title: getDayLabel(date),
      dayKey,
      data: [...incomplete, ...completed],
    });
  }

  const handleSnoozeSelect = (dayKey: string | null, isLater: boolean) => {
    if (!snoozeItemId) return;
    const item = items[snoozeItemId];
    if (!item) return;
    const prevDayKey = item.dayKey;
    const prevIsLater = item.isLater;
    moveItem(snoozeItemId, dayKey, isLater);
    const label = isLater ? 'Moved to Later' : 'Snoozed';
    show(label, () => { moveItem(snoozeItemId, prevDayKey, prevIsLater); });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.text }]}>Timeline</Text>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section }) => (
          <View style={[styles.sectionHeader, { backgroundColor: colors.bg }]}>
            <Text style={[styles.sectionHeaderText, { color: colors.text }]}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <TaskRow item={item} colors={colors} navigation={navigation} onRequestSnooze={setSnoozeItemId} />
        )}
        renderSectionFooter={({ section }) => (
          <AddTaskRow dayKey={(section as TimelineSection).dayKey} colors={colors} />
        )}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
      />

      <SnoozeModal
        visible={!!snoozeItemId}
        colors={colors}
        onSelect={handleSnoozeSelect}
        onClose={() => setSnoozeItemId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 40, fontWeight: '700', paddingHorizontal: 20, paddingTop: 28, marginBottom: 16 },
  list: { paddingBottom: 100, paddingHorizontal: 12 },
  sectionHeader: { paddingTop: 24, paddingBottom: 8, paddingHorizontal: 20 },
  sectionHeaderText: { fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  taskRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 10, marginVertical: 1,
  },
  taskText: { flex: 1, fontSize: 15, lineHeight: 21 },

  addTaskRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, paddingHorizontal: 12,
    marginBottom: 4,
  },
  addTaskText: { fontSize: 14 },
  addTaskInputRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8, paddingHorizontal: 12,
    marginBottom: 4,
  },
  addTaskInput: { fontSize: 15, padding: 0 },
});
