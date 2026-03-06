import { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { usePlannerStore, selectItemsForDay } from '../store/usePlannerStore';
import { toDayKey } from '../../shared/lib/dates';
import { format } from 'date-fns';
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
      {item.isPriority && <View style={[styles.priorityDot, { backgroundColor: '#ef4444' }]} />}
      {item.isMediumPriority && <View style={[styles.priorityDot, { backgroundColor: '#f59e0b' }]} />}
    </TouchableOpacity>
  );
}

export function TodayScreen() {
  const items = usePlannerStore((s) => s.items);
  const addItem = usePlannerStore((s) => s.addItem);
  const todayKey = toDayKey(new Date());
  const todayItems = selectItemsForDay(items, todayKey);
  const [addText, setAddText] = useState('');
  const inputRef = useRef<TextInput>(null);

  const handleAdd = () => {
    const trimmed = addText.trim();
    if (!trimmed) return;
    addItem({ type: 'task', text: trimmed, dayKey: todayKey });
    setAddText('');
  };

  const incomplete = todayItems.filter((i) => !i.completed);
  const completed = todayItems.filter((i) => i.completed);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Today</Text>
      <Text style={styles.date}>{format(new Date(), 'EEEE, MMMM d')}</Text>

      <FlatList
        data={[...incomplete, ...completed]}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TaskRow item={item} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No tasks for today. Add one below.</Text>
        }
      />

      <View style={styles.addBar}>
        <TextInput
          ref={inputRef}
          style={styles.addInput}
          placeholder="Add a task..."
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
  title: { fontSize: 28, fontWeight: '700', color: '#1c1917', paddingHorizontal: 20, paddingTop: 16 },
  date: { fontSize: 14, color: '#78716c', paddingHorizontal: 20, marginTop: 2, marginBottom: 16 },
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
  priorityDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
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
