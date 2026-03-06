import { useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlannerStore, selectInboxItems } from '../store/usePlannerStore';
import type { PlannerItem } from '../../shared/types';

function TaskRow({ item }: { item: PlannerItem }) {
  const updateItem = usePlannerStore((s) => s.updateItem);
  const deleteItem = usePlannerStore((s) => s.deleteItem);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);

  const commitEdit = () => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== item.text) updateItem(item.id, { text: trimmed });
    else setEditText(item.text);
    setEditing(false);
  };

  return (
    <View style={styles.taskRow}>
      {item.type === 'task' && (
        <TouchableOpacity
          onPress={() => updateItem(item.id, { completed: !item.completed })}
          style={[styles.checkbox, item.completed && styles.checkboxDone]}
        >
          {item.completed && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>
      )}
      {editing ? (
        <TextInput
          style={styles.editInput}
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
          onLongPress={() => deleteItem(item.id)}
        >
          <Text style={[styles.taskText, item.completed && styles.taskTextDone]} numberOfLines={3}>
            {item.text}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function InboxScreen() {
  const items = usePlannerStore((s) => s.items);
  const addItem = usePlannerStore((s) => s.addItem);
  const insets = useSafeAreaInsets();
  const inboxItems = selectInboxItems(items);
  const [addText, setAddText] = useState('');

  const handleAdd = () => {
    const trimmed = addText.trim();
    if (!trimmed) return;
    addItem({ type: 'task', text: trimmed, dayKey: null });
    setAddText('');
  };

  const renderItem = useCallback(({ item }: { item: PlannerItem }) => (
    <TaskRow item={item} />
  ), []);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.title}>Inbox</Text>
      </View>

      <FlatList
        data={inboxItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>Inbox is empty.</Text>
        }
      />

      <View style={[styles.addBar, { paddingBottom: 8 }]}>
        <TextInput
          style={styles.addInput}
          placeholder="Add to inbox..."
          placeholderTextColor="#a8a29e"
          value={addText}
          onChangeText={setAddText}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafaf9' },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: '700', color: '#1c1917' },
  list: { paddingBottom: 80 },
  empty: { fontSize: 14, color: '#a8a29e', textAlign: 'center', marginTop: 40 },
  taskRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20,
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
  editInput: { flex: 1, fontSize: 15, color: '#1c1917', padding: 0 },
  addBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e7e5e4', backgroundColor: '#fafaf9',
  },
  addInput: {
    flex: 1, fontSize: 15, color: '#1c1917', backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#e7e5e4', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
  },
  addButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#1c1917',
    alignItems: 'center', justifyContent: 'center', marginLeft: 10,
  },
  addButtonText: { fontSize: 22, color: '#fff', fontWeight: '500', marginTop: -1 },
});
