import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Pressable, StyleSheet,
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
import { useToast } from '../components/Toast';
import { useColors, type Colors } from '../lib/colors';

function TaskRow({ item, colors, navigation, drag, isActive }: { item: PlannerItem; colors: Colors; navigation: any; drag: () => void; isActive: boolean }) {
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
    <ScaleDecorator>
      <SwipeableRow
        onDelete={handleDelete}
        onSnooze={handleSnooze}
        onMoveToInbox={handleMoveToInbox}
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
                styles.taskText,
                { color: colors.text },
                item.completed && { color: colors.textMuted, textDecorationLine: 'line-through' },
              ]}
              numberOfLines={3}
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
    </ScaleDecorator>
  );
}

export function TodayScreen() {
  const items = usePlannerStore((s) => s.items);
  const addItem = usePlannerStore((s) => s.addItem);
  const reorderItems = usePlannerStore((s) => s.reorderItems);
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const todayKey = toDayKey(new Date());
  const todayItems = selectItemsForDay(items, todayKey);
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);

  // Check if all tasks are done (exclude practice items)
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

  const handleDragEnd = useCallback(({ data }: { data: PlannerItem[] }) => {
    reorderItems(data.map((i) => i.id));
  }, [reorderItems]);

  const renderItem = useCallback(({ item, drag, isActive }: RenderItemParams<PlannerItem>) => (
    <TaskRow item={item} colors={colors} navigation={navigation} drag={drag} isActive={isActive} />
  ), [colors, navigation]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <DraggableFlatList
        data={showAllDone ? [] : todayItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onDragEnd={handleDragEnd}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={{ paddingTop: insets.top + 8 }}>
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }} />
              <TouchableOpacity
                onPress={() => navigation.navigate('Settings')}
                style={styles.settingsButton}
              >
                <View style={styles.dotsMenu}>
                  <View style={[styles.dot, { backgroundColor: colors.textMuted }]} />
                  <View style={[styles.dot, { backgroundColor: colors.textMuted }]} />
                  <View style={[styles.dot, { backgroundColor: colors.textMuted }]} />
                </View>
              </TouchableOpacity>
            </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row', justifyContent: 'flex-end',
    paddingHorizontal: 20, paddingBottom: 4,
  },
  settingsButton: { padding: 8 },
  dotsMenu: { flexDirection: 'column', alignItems: 'center', gap: 3 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  list: { paddingBottom: 80, paddingHorizontal: 12 },
  empty: { fontSize: 14, textAlign: 'center', marginTop: 40 },
  taskRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 10, marginVertical: 1,
  },
  taskText: { flex: 1, fontSize: 15, lineHeight: 21 },
});
