import { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { usePlannerStore, selectInboxItems } from '../store/usePlannerStore';
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
    </TouchableOpacity>
  );
}

export function InboxScreen() {
  const items = usePlannerStore((s) => s.items);
  const addItem = usePlannerStore((s) => s.addItem);
  const inboxItems = selectInboxItems(items);
  const [addText, setAddText] = useState('');
  const inputRef = useRef<TextInput>(null);

  const handleAdd = () => {
    const trimmed = addText.trim();
    if (!trimmed) return;
    addItem({ type: 'task', text: trimmed, dayKey: null });
    setAddText('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Inbox</Text>

      <FlatList
        data={inboxItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TaskRow item={item} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>Inbox is empty.</Text>
        }
      />

      <View style={styles.addBar}>
        <TextInput
          ref={inputRef}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafaf9' },
  title: { fontSize: 28, fontWeight: '700', color: '#1c1917', paddingHorizontal: 20, paddingTop: 16, marginBottom: 16 },
  list: { paddingHorizontal: 20, paddingBottom: 80 },
  empty: { fontSize: 14, color: '#a8a29e', textAlign: 'center', marginTop: 40 },
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
  addBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12,
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
