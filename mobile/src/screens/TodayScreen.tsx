import { useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { usePlannerStore, selectItemsForDay } from '../store/usePlannerStore';
import { toDayKey } from '../../../shared/lib/dates';
import { format } from 'date-fns';
import type { PlannerItem } from '../../../shared/types';
import { SwipeableRow } from '../components/SwipeableRow';
import { useToast } from '../components/Toast';
import { useColors, type Colors } from '../lib/colors';
import { addDays } from 'date-fns';

function TaskRow({ item, colors, drag, isActive }: { item: PlannerItem; colors: Colors; drag: () => void; isActive: boolean }) {
  const updateItem = usePlannerStore((s) => s.updateItem);
  const deleteItem = usePlannerStore((s) => s.deleteItem);
  const moveItem = usePlannerStore((s) => s.moveItem);
  const addItem = usePlannerStore((s) => s.addItem);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const { show } = useToast();

  const commitEdit = () => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== item.text) updateItem(item.id, { text: trimmed });
    else setEditText(item.text);
    setEditing(false);
  };

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

  return (
    <ScaleDecorator>
      <SwipeableRow onDelete={handleDelete} onSnooze={handleSnooze} enabled={!isActive}>
        <TouchableOpacity
          activeOpacity={0.7}
          onLongPress={drag}
          disabled={isActive}
          style={[styles.taskRow, { borderBottomColor: colors.border, backgroundColor: isActive ? colors.surface : colors.bg }]}
        >
          {item.type === 'task' && (
            <TouchableOpacity
              onPress={() => updateItem(item.id, { completed: !item.completed })}
              style={[styles.checkbox, { borderColor: colors.checkboxBorder }, item.completed && { backgroundColor: colors.checkboxDone, borderColor: colors.checkboxDone }]}
            >
              {item.completed && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          )}

          {editing ? (
            <TextInput
              style={[styles.editInput, { color: colors.text }]}
              value={editText}
              onChangeText={setEditText}
              onBlur={commitEdit}
              onSubmitEditing={commitEdit}
              autoFocus
            />
          ) : (
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => { setEditText(item.text); setEditing(true); }}
            >
              <Text style={[styles.taskText, { color: colors.text }, item.completed && { color: colors.textMuted, textDecorationLine: 'line-through' }]} numberOfLines={3}>
                {item.text}
              </Text>
            </TouchableOpacity>
          )}

          {(item.isPriority || item.isMediumPriority) && (
            <View style={[styles.priorityDot, {
              backgroundColor: item.isPriority ? '#ef4444' : '#f59e0b',
            }]} />
          )}
        </TouchableOpacity>
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
  const [addText, setAddText] = useState('');

  const handleAdd = () => {
    const trimmed = addText.trim();
    if (!trimmed) return;
    addItem({ type: 'task', text: trimmed, dayKey: todayKey });
    setAddText('');
  };

  const handleDragEnd = useCallback(({ data }: { data: PlannerItem[] }) => {
    reorderItems(data.map((i) => i.id));
  }, [reorderItems]);

  const renderItem = useCallback(({ item, drag, isActive }: RenderItemParams<PlannerItem>) => (
    <TaskRow item={item} colors={colors} drag={drag} isActive={isActive} />
  ), [colors]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Today</Text>
          <Text style={[styles.date, { color: colors.textSecondary }]}>{format(new Date(), 'EEEE, MMMM d')}</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('Settings')}
          style={styles.settingsButton}
        >
          <Text style={{ fontSize: 20 }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Task list */}
      <DraggableFlatList
        data={todayItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onDragEnd={handleDragEnd}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textMuted }]}>No tasks for today. Add one below.</Text>
        }
      />

      {/* Add bar */}
      <View style={[styles.addBar, { borderTopColor: colors.border, backgroundColor: colors.bg }]}>
        <TextInput
          style={[styles.addInput, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
          placeholder="Add a task..."
          placeholderTextColor={colors.textMuted}
          value={addText}
          onChangeText={setAddText}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.accent }]} onPress={handleAdd}>
          <Text style={[styles.addButtonText, { color: colors.accentText }]}>+</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12,
  },
  title: { fontSize: 28, fontWeight: '700' },
  date: { fontSize: 14, marginTop: 2 },
  settingsButton: { padding: 4, marginTop: 4 },
  list: { paddingBottom: 80 },
  empty: { fontSize: 14, textAlign: 'center', marginTop: 40 },
  taskRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  checkmark: { fontSize: 13, color: '#fff', fontWeight: '600' },
  taskText: { flex: 1, fontSize: 15, lineHeight: 21 },
  editInput: { flex: 1, fontSize: 15, padding: 0 },
  priorityDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
  addBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth, paddingBottom: 8,
  },
  addInput: {
    flex: 1, fontSize: 15, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
  },
  addButton: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', marginLeft: 10,
  },
  addButtonText: { fontSize: 22, fontWeight: '500', marginTop: -1 },
});
