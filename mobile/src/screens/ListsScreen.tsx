import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlannerStore, selectLaterItems } from '../store/usePlannerStore';
import type { PlannerItem } from '../../shared/types';

type SubView =
  | { kind: 'later' }
  | { kind: 'archive' }
  | { kind: 'customList'; listId: string; listName: string }
  | { kind: 'label'; tag: string };

function TaskRow({ item }: { item: PlannerItem }) {
  const updateItem = usePlannerStore((s) => s.updateItem);

  return (
    <TouchableOpacity
      style={styles.taskRow}
      onPress={() => updateItem(item.id, { completed: !item.completed })}
      activeOpacity={0.6}
    >
      <View style={[styles.checkbox, item.completed && styles.checkboxDone]}>
        {item.completed && <Text style={styles.checkmark}>{'✓'}</Text>}
      </View>
      <Text style={[styles.taskText, item.completed && styles.taskTextDone]} numberOfLines={2}>
        {item.text}
      </Text>
    </TouchableOpacity>
  );
}

function useFilteredItems(subView: SubView | null): PlannerItem[] {
  const items = usePlannerStore((s) => s.items);

  return useMemo(() => {
    if (!subView) return [];
    const all = Object.values(items);

    switch (subView.kind) {
      case 'later':
        return all
          .filter((i) => i.dayKey === null && i.isLater === true && !i.isArchived && !i.parentId)
          .sort((a, b) => a.order - b.order);
      case 'archive':
        return all
          .filter((i) => i.isArchived && !i.parentId)
          .sort((a, b) => a.order - b.order);
      case 'customList':
        return all
          .filter((i) => i.listId === subView.listId && !i.parentId && !i.isArchived)
          .sort((a, b) => a.order - b.order);
      case 'label': {
        const pattern = new RegExp(subView.tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        return all
          .filter((i) => pattern.test(i.text))
          .sort((a, b) => a.order - b.order);
      }
    }
  }, [items, subView]);
}

function useAllLabels(): string[] {
  const items = usePlannerStore((s) => s.items);

  return useMemo(() => {
    const tags = new Set<string>();
    for (const item of Object.values(items)) {
      const matches = item.text.match(/#\w+/g);
      if (matches) {
        for (const m of matches) {
          tags.add(m.toLowerCase());
        }
      }
    }
    return Array.from(tags).sort();
  }, [items]);
}

function subViewTitle(subView: SubView): string {
  switch (subView.kind) {
    case 'later':
      return 'Later';
    case 'archive':
      return 'Archive';
    case 'customList':
      return subView.listName;
    case 'label':
      return subView.tag;
  }
}

export function ListsScreen() {
  const [subView, setSubView] = useState<SubView | null>(null);
  const customLists = usePlannerStore((s) => s.customLists);
  const labels = useAllLabels();
  const filteredItems = useFilteredItems(subView);
  const insets = useSafeAreaInsets();

  if (subView) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => setSubView(null)} activeOpacity={0.6}>
          <Text style={styles.backText}>{'< Lists'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{subViewTitle(subView)}</Text>

        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TaskRow item={item} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>No items.</Text>
          }
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Lists</Text>

      <FlatList
        data={[]}
        keyExtractor={() => ''}
        renderItem={() => null}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            {/* Built-in lists */}
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => setSubView({ kind: 'later' })}
              activeOpacity={0.6}
            >
              <Text style={styles.menuText}>Later</Text>
              <Text style={styles.chevron}>{'>'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => setSubView({ kind: 'archive' })}
              activeOpacity={0.6}
            >
              <Text style={styles.menuText}>Archive</Text>
              <Text style={styles.chevron}>{'>'}</Text>
            </TouchableOpacity>

            {/* Custom lists */}
            {customLists
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((cl) => (
                <TouchableOpacity
                  key={cl.id}
                  style={styles.menuRow}
                  onPress={() => setSubView({ kind: 'customList', listId: cl.id, listName: cl.name })}
                  activeOpacity={0.6}
                >
                  <Text style={styles.menuText}>{cl.name}</Text>
                  <Text style={styles.chevron}>{'>'}</Text>
                </TouchableOpacity>
              ))}

            {/* Labels section */}
            {labels.length > 0 && (
              <>
                <Text style={styles.sectionHeader}>Labels</Text>
                {labels.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={styles.menuRow}
                    onPress={() => setSubView({ kind: 'label', tag })}
                    activeOpacity={0.6}
                  >
                    <Text style={styles.menuText}>{tag}</Text>
                    <Text style={styles.chevron}>{'>'}</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafaf9' },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1c1917',
    paddingHorizontal: 20,
    paddingTop: 16,
    marginBottom: 16,
  },
  list: { paddingHorizontal: 20, paddingBottom: 80 },
  empty: { fontSize: 14, color: '#a8a29e', textAlign: 'center', marginTop: 40 },

  // Back button
  backButton: { paddingHorizontal: 20, paddingTop: 12 },
  backText: { fontSize: 16, color: '#78716c' },

  // Menu rows
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e7e5e4',
  },
  menuText: { fontSize: 16, color: '#1c1917' },
  chevron: { fontSize: 16, color: '#78716c' },

  // Section header
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78716c',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 8,
  },

  // Task rows
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e7e5e4',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#d6d3d1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxDone: { backgroundColor: '#a8a29e', borderColor: '#a8a29e' },
  checkmark: { fontSize: 13, color: '#fff', fontWeight: '600' },
  taskText: { flex: 1, fontSize: 15, color: '#1c1917', lineHeight: 21 },
  taskTextDone: { color: '#a8a29e', textDecorationLine: 'line-through' },
});
