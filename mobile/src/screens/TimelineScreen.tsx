import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, FlatList, Pressable, TouchableOpacity, StyleSheet, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { usePlannerStore, selectItemsForDay } from '../store/usePlannerStore';
import { toDayKey } from '../../../shared/lib/dates';
import { addDays, isToday, isTomorrow, format, isPast, startOfDay } from 'date-fns';
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
        <View style={styles.taskRow}>
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
      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
        <Path d="M12 4.5v15m7.5-7.5h-15" stroke={colors.textMuted} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      <Text style={[styles.addTaskText, { color: colors.textMuted }]}>Add task</Text>
    </TouchableOpacity>
  );
}

interface DayData {
  date: Date;
  dayKey: string;
  dayNum: string;
  weekday: string;
  isCurrentDay: boolean;
  isPastDay: boolean;
  items: PlannerItem[];
}

function DayColumn({ day, colors, navigation, onRequestSnooze }: {
  day: DayData; colors: Colors; navigation: any;
  onRequestSnooze: (itemId: string) => void;
}) {
  const dayNumColor = day.isCurrentDay
    ? colors.accent
    : day.isPastDay
      ? colors.textMuted
      : colors.text;

  const weekdayColor = day.isCurrentDay
    ? colors.accent
    : day.isPastDay
      ? colors.textMuted
      : colors.textSecondary;

  return (
    <View style={[
      styles.dayColumn,
      day.isCurrentDay
        ? { backgroundColor: colors.todayBg, borderRadius: 16 }
        : { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    ]}>
      <View style={styles.dayLayout}>
        {/* Left: day number + weekday */}
        <View style={styles.dayLabel}>
          <Text style={[styles.dayNum, { color: dayNumColor }]}>{day.dayNum}</Text>
          <Text style={[styles.weekday, { color: weekdayColor }]}>{day.weekday}</Text>
        </View>

        {/* Right: tasks + add task */}
        <View style={styles.dayContent}>
          {day.items.map((item) => (
            <TaskRow
              key={item.id}
              item={item}
              colors={colors}
              navigation={navigation}
              onRequestSnooze={onRequestSnooze}
            />
          ))}
          <AddTaskRow dayKey={day.dayKey} colors={colors} />
        </View>
      </View>
    </View>
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
  const days: DayData[] = [];

  for (let i = 0; i < 14; i++) {
    const date = addDays(today, i);
    const dayKey = toDayKey(date);
    const dayItems = selectItemsForDay(items, dayKey);
    const incomplete = dayItems.filter((item) => !item.completed);
    const completed = dayItems.filter((item) => item.completed);

    days.push({
      date,
      dayKey,
      dayNum: format(date, 'd'),
      weekday: format(date, 'EEE'),
      isCurrentDay: isToday(date),
      isPastDay: isPast(startOfDay(date)) && !isToday(date),
      items: [...completed, ...incomplete],
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

      <FlatList
        data={days}
        keyExtractor={(day) => day.dayKey}
        renderItem={({ item: day }) => (
          <DayColumn day={day} colors={colors} navigation={navigation} onRequestSnooze={setSnoozeItemId} />
        )}
        contentContainerStyle={styles.list}
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

  // Day column (2-column layout like PWA)
  dayColumn: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    minHeight: 70,
  },
  dayLayout: {
    flexDirection: 'row',
    gap: 12,
  },
  dayLabel: {
    width: 48,
    flexShrink: 0,
    alignItems: 'center',
    paddingTop: 2,
  },
  dayNum: {
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 30,
  },
  weekday: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 1,
  },
  dayContent: {
    flex: 1,
    minWidth: 0,
  },

  // Task rows
  taskRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, paddingHorizontal: 4,
    borderRadius: 8, marginVertical: 1,
  },
  taskText: { flex: 1, fontSize: 15, lineHeight: 21 },

  // Add task
  addTaskRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 4,
  },
  addTaskText: { fontSize: 13 },
  addTaskInputRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8, paddingHorizontal: 4,
  },
  addTaskInput: { fontSize: 15, padding: 0 },
});
