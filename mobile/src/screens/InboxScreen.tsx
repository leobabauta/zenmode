import { useState, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, Platform, Vibration, RefreshControl,
} from 'react-native';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { usePlannerStore, selectInboxItems } from '../store/usePlannerStore';
import { toDayKey } from '../../../shared/lib/dates';
import { addDays } from 'date-fns';
import type { PlannerItem } from '../../../shared/types';
import { SwipeableRow } from '../components/SwipeableRow';
import { Checkbox } from '../components/Checkbox';
import { PriorityStar } from '../components/PriorityStar';
import { SnoozeModal } from '../components/SnoozeModal';
import { useToast } from '../components/Toast';
import { useColors, type Colors } from '../lib/colors';
import { EmptyInbox } from '../components/EmptyState';
import { AddTaskFAB } from '../components/AddTaskFAB';
import { pullFromSupabase, pullPreferences } from '../../../shared/lib/sync';
import { parseReminder } from '../../../shared/lib/reminderParser';
import * as Haptics from 'expo-haptics';

const triggerHaptic = () => {
  if (Platform.OS === 'ios') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } else {
    Vibration.vibrate(40);
  }
};

const triggerHapticMedium = () => {
  if (Platform.OS === 'ios') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } else {
    Vibration.vibrate(60);
  }
};

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
        isMediumPriority: snapshot.isMediumPriority,
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

  const handleArchive = () => {
    const prevDayKey = item.dayKey;
    const prevIsLater = item.isLater;
    moveItem(item.id, null, true);
    show('Archived', () => { moveItem(item.id, prevDayKey, prevIsLater); });
  };

  return (
    <ScaleDecorator>
      <SwipeableRow
        onTomorrow={handleTomorrow}
        onSnooze={() => onRequestSnooze(item.id)}
        onArchive={handleArchive}
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

export function InboxScreen() {
  const items = usePlannerStore((s) => s.items);
  const addItem = usePlannerStore((s) => s.addItem);
  const moveItem = usePlannerStore((s) => s.moveItem);
  const reorderItems = usePlannerStore((s) => s.reorderItems);
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const inboxItems = selectInboxItems(items);
  const { show } = useToast();

  const [snoozeItemId, setSnoozeItemId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await pullFromSupabase();
      await pullPreferences();
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleAdd = (text: string, destination: import('../components/AddTaskFAB').AddDestination) => {
    const reminder = parseReminder(text);
    if (reminder) {
      const reminderDate = new Date(reminder.reminderAt);
      const dayKey = `${reminderDate.getFullYear()}-${String(reminderDate.getMonth() + 1).padStart(2, '0')}-${String(reminderDate.getDate()).padStart(2, '0')}`;
      addItem({ type: 'task', text: reminder.cleanText, dayKey, reminderAt: reminder.reminderAt });
      return;
    }
    if (destination === 'inbox') {
      addItem({ type: 'task', text, dayKey: null });
    } else if (destination === 'today') {
      addItem({ type: 'task', text, dayKey: toDayKey(new Date()) });
    } else {
      addItem({ type: 'task', text, dayKey: null, listId: destination.listId });
    }
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
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={[styles.title, { color: colors.text }]}>Inbox</Text>
      </View>

      <DraggableFlatList
        data={inboxItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onDragEnd={handleDragEnd}
        onDragBegin={triggerHapticMedium}
        onPlaceholderIndexChange={triggerHaptic}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} />}
        ListEmptyComponent={<EmptyInbox colors={colors} />}
      />

      <AddTaskFAB colors={colors} placeholder="Add to inbox..." defaultDestination="inbox" onAdd={handleAdd} />

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
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 40, fontWeight: '700' },
  list: { paddingBottom: 80, paddingHorizontal: 12 },
  taskRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 10, marginVertical: 1,
  },
  taskText: { flex: 1, fontSize: 15, lineHeight: 21 },
});
