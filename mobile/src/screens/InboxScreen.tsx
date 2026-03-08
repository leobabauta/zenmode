import { useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlannerStore, selectInboxItems } from '../store/usePlannerStore';
import { toDayKey } from '../../../shared/lib/dates';
import { addDays } from 'date-fns';
import type { PlannerItem } from '../../../shared/types';
import { SwipeableRow } from '../components/SwipeableRow';
import { useToast } from '../components/Toast';
import { useColors, type Colors } from '../lib/colors';

function TaskRow({ item, colors }: { item: PlannerItem; colors: Colors }) {
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
    show('Moved to tomorrow', () => {
      moveItem(item.id, prevDayKey, prevIsLater);
    });
  };

  return (
    <SwipeableRow onDelete={handleDelete} onSnooze={handleSnooze}>
      <View style={[styles.taskRow, { borderBottomColor: colors.border, backgroundColor: colors.bg }]}>
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
      </View>
    </SwipeableRow>
  );
}

export function InboxScreen() {
  const items = usePlannerStore((s) => s.items);
  const addItem = usePlannerStore((s) => s.addItem);
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const inboxItems = selectInboxItems(items);
  const [addText, setAddText] = useState('');

  const handleAdd = () => {
    const trimmed = addText.trim();
    if (!trimmed) return;
    addItem({ type: 'task', text: trimmed, dayKey: null });
    setAddText('');
  };

  const renderItem = useCallback(({ item }: { item: PlannerItem }) => (
    <TaskRow item={item} colors={colors} />
  ), [colors]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={[styles.title, { color: colors.text }]}>Inbox</Text>
      </View>

      <FlatList
        data={inboxItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textMuted }]}>Inbox is empty.</Text>
        }
      />

      <View style={[styles.addBar, { borderTopColor: colors.border, backgroundColor: colors.bg }]}>
        <TextInput
          style={[styles.addInput, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
          placeholder="Add to inbox..."
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
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: '700' },
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
