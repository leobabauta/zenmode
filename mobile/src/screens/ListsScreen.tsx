import { useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlannerStore, selectLaterItems } from '../store/usePlannerStore';
import { toDayKey } from '../../../shared/lib/dates';
import { addDays } from 'date-fns';
import type { PlannerItem } from '../../../shared/types';
import { SwipeableRow } from '../components/SwipeableRow';
import { Checkbox } from '../components/Checkbox';
import { PriorityStar } from '../components/PriorityStar';
import { useToast } from '../components/Toast';
import { useColors, type Colors } from '../lib/colors';

type SubView =
  | { kind: 'later' }
  | { kind: 'archive' }
  | { kind: 'customList'; listId: string; listName: string }
  | { kind: 'label'; tag: string };

function TaskRow({ item, colors, drag, isActive }: { item: PlannerItem; colors: Colors; drag: () => void; isActive: boolean }) {
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
    <ScaleDecorator>
      <SwipeableRow onDelete={handleDelete} onSnooze={handleSnooze} enabled={!isActive}>
        <TouchableOpacity
          activeOpacity={0.7}
          onLongPress={drag}
          disabled={isActive}
          style={[styles.taskRow, { backgroundColor: isActive ? colors.surface : colors.bg }]}
          onPress={() => updateItem(item.id, { completed: !item.completed })}
        >
          <Checkbox
            checked={!!item.completed}
            onChange={(checked) => updateItem(item.id, { completed: checked })}
            colors={colors}
          />
          <Text
            style={[
              styles.taskText,
              { color: colors.text },
              item.completed && { color: colors.textMuted, textDecorationLine: 'line-through' },
            ]}
            numberOfLines={2}
          >
            {item.text}
          </Text>
          <PriorityStar
            isPriority={item.isPriority}
            isMediumPriority={item.isMediumPriority}
            colors={colors}
          />
        </TouchableOpacity>
      </SwipeableRow>
    </ScaleDecorator>
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
  const reorderItems = usePlannerStore((s) => s.reorderItems);
  const labels = useAllLabels();
  const filteredItems = useFilteredItems(subView);
  const insets = useSafeAreaInsets();
  const colors = useColors();

  const handleDragEnd = useCallback(({ data }: { data: PlannerItem[] }) => {
    reorderItems(data.map((i) => i.id));
  }, [reorderItems]);

  const renderItem = useCallback(({ item, drag, isActive }: RenderItemParams<PlannerItem>) => (
    <TaskRow item={item} colors={colors} drag={drag} isActive={isActive} />
  ), [colors]);

  if (subView) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => setSubView(null)} activeOpacity={0.6}>
          <Text style={[styles.backText, { color: colors.accent }]}>{'< Lists'}</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>{subViewTitle(subView)}</Text>

        <DraggableFlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onDragEnd={handleDragEnd}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.textMuted }]}>No items.</Text>
          }
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.text }]}>Lists</Text>

      <FlatList
        data={[]}
        keyExtractor={() => ''}
        renderItem={() => null}
        contentContainerStyle={styles.menuList}
        ListHeaderComponent={
          <>
            <TouchableOpacity
              style={[styles.menuRow, { borderBottomColor: colors.border }]}
              onPress={() => setSubView({ kind: 'later' })}
              activeOpacity={0.6}
            >
              <Text style={[styles.menuText, { color: colors.text }]}>Later</Text>
              <Text style={[styles.chevron, { color: colors.textMuted }]}>{'>'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuRow, { borderBottomColor: colors.border }]}
              onPress={() => setSubView({ kind: 'archive' })}
              activeOpacity={0.6}
            >
              <Text style={[styles.menuText, { color: colors.text }]}>Archive</Text>
              <Text style={[styles.chevron, { color: colors.textMuted }]}>{'>'}</Text>
            </TouchableOpacity>

            {customLists
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((cl) => (
                <TouchableOpacity
                  key={cl.id}
                  style={[styles.menuRow, { borderBottomColor: colors.border }]}
                  onPress={() => setSubView({ kind: 'customList', listId: cl.id, listName: cl.name })}
                  activeOpacity={0.6}
                >
                  <Text style={[styles.menuText, { color: colors.text }]}>{cl.name}</Text>
                  <Text style={[styles.chevron, { color: colors.textMuted }]}>{'>'}</Text>
                </TouchableOpacity>
              ))}

            {labels.length > 0 && (
              <>
                <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>Labels</Text>
                {labels.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={[styles.menuRow, { borderBottomColor: colors.border }]}
                    onPress={() => setSubView({ kind: 'label', tag })}
                    activeOpacity={0.6}
                  >
                    <Text style={[styles.menuText, { color: colors.text }]}>{tag}</Text>
                    <Text style={[styles.chevron, { color: colors.textMuted }]}>{'>'}</Text>
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
  container: { flex: 1 },
  title: {
    fontSize: 28, fontWeight: '700', paddingHorizontal: 20, paddingTop: 16, marginBottom: 16,
  },
  list: { paddingHorizontal: 12, paddingBottom: 80 },
  menuList: { paddingHorizontal: 20, paddingBottom: 80 },
  empty: { fontSize: 14, textAlign: 'center', marginTop: 40 },
  backButton: { paddingHorizontal: 20, paddingTop: 12 },
  backText: { fontSize: 16 },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuText: { fontSize: 16 },
  chevron: { fontSize: 16 },
  sectionHeader: {
    fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5,
    marginTop: 24, marginBottom: 8,
  },
  taskRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 10, marginVertical: 1,
  },
  taskText: { flex: 1, fontSize: 15, lineHeight: 21 },
});
