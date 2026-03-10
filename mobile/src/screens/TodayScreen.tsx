import { useState, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet,
} from 'react-native';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { usePlannerStore, selectItemsForDay } from '../store/usePlannerStore';
import { toDayKey } from '../../../shared/lib/dates';
import { addDays } from 'date-fns';
import type { PlannerItem } from '../../../shared/types';
import { SwipeableRow } from '../components/SwipeableRow';
import { Checkbox } from '../components/Checkbox';
import { PriorityStar } from '../components/PriorityStar';
import { GreetingBanner } from '../components/GreetingBanner';
import { AllDoneToday } from '../components/EmptyState';
import { AddTaskFAB } from '../components/AddTaskFAB';
import { SnoozeModal } from '../components/SnoozeModal';
import { useToast } from '../components/Toast';
import { useColors, type Colors } from '../lib/colors';
import * as Haptics from 'expo-haptics';

function TaskRow({ item, colors, navigation, drag, isActive, onRequestSnooze }: {
  item: PlannerItem; colors: Colors; navigation: any; drag: () => void; isActive: boolean;
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
    <ScaleDecorator>
      <SwipeableRow
        onTomorrow={handleTomorrow}
        onSnooze={() => onRequestSnooze(item.id)}
        onMoveToInbox={handleMoveToInbox}
        onDelete={handleDelete}
        enabled={!isActive}
      >
        <Pressable
          onPress={() => navigation.navigate('TaskDetail', { itemId: item.id })}
          onLongPress={drag}
          disabled={isActive}
        >
          <View style={[styles.taskRow, { backgroundColor: isActive ? colors.surface : colors.bg }]}>
            {item.type === 'task' && (
              <Checkbox
                checked={!!item.completed}
                onChange={(checked) => updateItem(item.id, { completed: checked })}
                colors={colors}
              />
            )}
            <Text
              style={[
                styles.taskText, { color: colors.text },
                item.completed && { color: colors.textMuted, textDecorationLine: 'line-through' },
              ]}
              numberOfLines={3}
            >
              {item.text}
            </Text>
            <PriorityStar isPriority={item.isPriority} isMediumPriority={item.isMediumPriority} colors={colors} />
          </View>
        </Pressable>
      </SwipeableRow>
    </ScaleDecorator>
  );
}

export function TodayScreen() {
  const items = usePlannerStore((s) => s.items);
  const addItem = usePlannerStore((s) => s.addItem);
  const moveItem = usePlannerStore((s) => s.moveItem);
  const reorderItems = usePlannerStore((s) => s.reorderItems);
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const todayKey = toDayKey(new Date());
  const todayItems = selectItemsForDay(items, todayKey);
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const { show } = useToast();

  const [snoozeItemId, setSnoozeItemId] = useState<string | null>(null);

  let totalTasks = 0;
  let doneTasks = 0;
  for (const item of Object.values(items)) {
    if (item.type !== 'task' || item.parentId || item.isArchived || item.dayKey !== todayKey || item.isPractice) continue;
    totalTasks++;
    if (item.completed) doneTasks++;
  }
  const allTasksDone = totalTasks > 0 && doneTasks === totalTasks;
  const showAllDone = allTasksDone && !showCompletedTasks;

  const handleAdd = (text: string) => {
    addItem({ type: 'task', text, dayKey: todayKey });
  };

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

  const handleDragEnd = useCallback(({ data }: { data: PlannerItem[] }) => {
    reorderItems(data.map((i) => i.id));
  }, [reorderItems]);

  const renderItem = useCallback(({ item, drag, isActive }: RenderItemParams<PlannerItem>) => (
    <TaskRow item={item} colors={colors} navigation={navigation} drag={drag} isActive={isActive} onRequestSnooze={setSnoozeItemId} />
  ), [colors, navigation]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <DraggableFlatList
        data={showAllDone ? [] : todayItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onDragEnd={handleDragEnd}
        onDragBegin={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
        onPlaceholderIndexChange={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={{ paddingTop: insets.top + 8 }}>
            <GreetingBanner colors={colors} />
            {showAllDone && (
              <AllDoneToday colors={colors} onShowCompleted={() => setShowCompletedTasks(true)} />
            )}
          </View>
        }
        ListEmptyComponent={
          showAllDone ? null : (
            <Text style={[styles.empty, { color: colors.textMuted }]}>No tasks for today. Add one below.</Text>
          )
        }
      />

      <AddTaskFAB colors={colors} onAdd={handleAdd} />

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
  list: { paddingBottom: 80, paddingHorizontal: 12 },
  empty: { fontSize: 14, textAlign: 'center', marginTop: 40 },
  taskRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 10, marginVertical: 1,
  },
  taskText: { flex: 1, fontSize: 15, lineHeight: 21 },
});
