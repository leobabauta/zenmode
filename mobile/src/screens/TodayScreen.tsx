import { useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { usePlannerStore, selectItemsForDay } from '../store/usePlannerStore';
import { toDayKey } from '../../shared/lib/dates';
import { format } from 'date-fns';
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

      {(item.isPriority || item.isMediumPriority) && (
        <View style={[styles.priorityDot, {
          backgroundColor: item.isPriority ? '#ef4444' : '#f59e0b',
        }]} />
      )}
    </View>
  );
}

export function TodayScreen() {
  const items = usePlannerStore((s) => s.items);
  const addItem = usePlannerStore((s) => s.addItem);
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const todayKey = toDayKey(new Date());
  const todayItems = selectItemsForDay(items, todayKey);
  const [addText, setAddText] = useState('');
  const inputRef = useRef<TextInput>(null);

  const practiceItems = todayItems.filter((i) => i.isPractice);
  const incomplete = todayItems.filter((i) => !i.completed && !i.isPractice);
  const completed = todayItems.filter((i) => i.completed);

  const handleAdd = () => {
    const trimmed = addText.trim();
    if (!trimmed) return;
    addItem({ type: 'task', text: trimmed, dayKey: todayKey });
    setAddText('');
  };

  const renderItem = useCallback(({ item }: { item: PlannerItem }) => (
    <TaskRow item={item} />
  ), []);

  const data = [...practiceItems, ...incomplete, ...completed];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View>
          <Text style={styles.title}>Today</Text>
          <Text style={styles.date}>{format(new Date(), 'EEEE, MMMM d')}</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('Settings')}
          style={styles.settingsButton}
        >
          <Text style={{ fontSize: 20 }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Practice section */}
      {practiceItems.length > 0 && (
        <View style={styles.practiceSection}>
          <Text style={styles.practiceLabel}>PRACTICE</Text>
        </View>
      )}

      {/* Task list */}
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No tasks for today. Add one below.</Text>
        }
      />

      {/* Add bar */}
      <View style={[styles.addBar, { paddingBottom: 8 }]}>
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafaf9' },
  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12,
  },
  title: { fontSize: 28, fontWeight: '700', color: '#1c1917' },
  date: { fontSize: 14, color: '#78716c', marginTop: 2 },
  settingsButton: { padding: 4, marginTop: 4 },
  practiceSection: { paddingHorizontal: 20, marginBottom: 4 },
  practiceLabel: { fontSize: 11, fontWeight: '600', color: '#78716c', letterSpacing: 1 },
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
  priorityDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
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
