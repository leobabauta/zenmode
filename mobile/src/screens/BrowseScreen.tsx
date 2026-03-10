import { useState, useMemo, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Pressable, StyleSheet } from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { usePlannerStore } from '../store/usePlannerStore';
import { toDayKey } from '../../../shared/lib/dates';
import { addDays } from 'date-fns';
import type { PlannerItem } from '../../../shared/types';
import { SwipeableRow } from '../components/SwipeableRow';
import { Checkbox } from '../components/Checkbox';
import { PriorityStar } from '../components/PriorityStar';
import { AddTaskFAB } from '../components/AddTaskFAB';
import { useToast } from '../components/Toast';
import { useColors, type Colors } from '../lib/colors';
import Svg, { Path } from 'react-native-svg';

type SubView =
  | { kind: 'later' }
  | { kind: 'archive' }
  | { kind: 'customList'; listId: string; listName: string }
  | { kind: 'label'; tag: string };

function SettingsIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function TaskRow({ item, colors, drag, isActive }: { item: PlannerItem; colors: Colors; drag: () => void; isActive: boolean }) {
  const updateItem = usePlannerStore((s) => s.updateItem);
  const deleteItem = usePlannerStore((s) => s.deleteItem);
  const moveItem = usePlannerStore((s) => s.moveItem);
  const addItem = usePlannerStore((s) => s.addItem);
  const navigation = useNavigation<any>();
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
    show('Moved to tomorrow', () => {
      moveItem(item.id, prevDayKey, prevIsLater);
    });
  };

  return (
    <ScaleDecorator>
      <SwipeableRow onDelete={handleDelete} onSnooze={handleSnooze} enabled={!isActive}>
        <Pressable
          onPress={() => navigation.navigate('TaskDetail', { itemId: item.id })}
          onLongPress={drag}
          disabled={isActive}
        >
          <View style={[styles.taskRow, { backgroundColor: isActive ? colors.surface : colors.bg }]}>
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
          </View>
        </Pressable>
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

function useSearchResults(query: string): { tasks: PlannerItem[]; labels: string[]; lists: { id: string; name: string }[] } {
  const items = usePlannerStore((s) => s.items);
  const customLists = usePlannerStore((s) => s.customLists);
  const allLabels = useAllLabels();

  return useMemo(() => {
    if (!query.trim()) return { tasks: [], labels: [], lists: [] };
    const q = query.toLowerCase();

    const tasks = Object.values(items)
      .filter((i) => !i.parentId && !i.isArchived && i.text.toLowerCase().includes(q))
      .sort((a, b) => a.order - b.order)
      .slice(0, 15);

    const labels = allLabels.filter((l) => l.includes(q));

    const lists = customLists
      .filter((cl) => cl.name.toLowerCase().includes(q))
      .sort((a, b) => a.order - b.order);

    return { tasks, labels, lists };
  }, [items, customLists, allLabels, query]);
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

export function BrowseScreen() {
  const [subView, setSubView] = useState<SubView | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const customLists = usePlannerStore((s) => s.customLists);
  const addItem = usePlannerStore((s) => s.addItem);
  const reorderItems = usePlannerStore((s) => s.reorderItems);
  const labels = useAllLabels();
  const filteredItems = useFilteredItems(subView);
  const searchResults = useSearchResults(searchQuery);
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const navigation = useNavigation<any>();
  const isSearching = searchQuery.trim().length > 0;

  const todayKey = toDayKey(new Date());
  const handleAdd = (text: string) => {
    addItem({ type: 'task', text, dayKey: todayKey });
  };

  const handleDragEnd = useCallback(({ data }: { data: PlannerItem[] }) => {
    reorderItems(data.map((i) => i.id));
  }, [reorderItems]);

  const renderItem = useCallback(({ item, drag, isActive }: RenderItemParams<PlannerItem>) => (
    <TaskRow item={item} colors={colors} drag={drag} isActive={isActive} />
  ), [colors]);

  // Sub-view: show filtered task list
  if (subView) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => setSubView(null)} activeOpacity={0.6}>
          <Text style={[styles.backText, { color: colors.accent }]}>{'< Browse'}</Text>
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
        <AddTaskFAB colors={colors} onAdd={handleAdd} />
      </View>
    );
  }

  // Main browse view
  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text, marginBottom: 0 }]}>Browse</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.settingsBtn}>
          <SettingsIcon color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" style={{ marginRight: 8 }}>
          <Path
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            stroke={colors.textMuted}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search tasks, lists, labels..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
            <Text style={{ color: colors.textMuted, fontSize: 16 }}>x</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={[]}
        keyExtractor={() => ''}
        renderItem={() => null}
        contentContainerStyle={styles.menuList}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          isSearching ? (
            <SearchResultsView
              results={searchResults}
              colors={colors}
              navigation={navigation}
              onSelectLabel={(tag) => { setSearchQuery(''); setSubView({ kind: 'label', tag }); }}
              onSelectList={(id, name) => { setSearchQuery(''); setSubView({ kind: 'customList', listId: id, listName: name }); }}
            />
          ) : (
            <>
              {/* Lists section */}
              <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>Lists</Text>

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

              {/* Labels section */}
              {labels.length > 0 && (
                <>
                  <Text style={[styles.sectionHeader, { color: colors.textSecondary, marginTop: 28 }]}>Labels</Text>
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

              {/* Help link */}
              <TouchableOpacity style={styles.helpLink} activeOpacity={0.6}>
                <Text style={[styles.helpText, { color: colors.textMuted }]}>Help</Text>
              </TouchableOpacity>
            </>
          )
        }
      />

      <AddTaskFAB colors={colors} onAdd={handleAdd} />
    </View>
  );
}

function SearchResultsView({
  results,
  colors,
  navigation,
  onSelectLabel,
  onSelectList,
}: {
  results: { tasks: PlannerItem[]; labels: string[]; lists: { id: string; name: string }[] };
  colors: Colors;
  navigation: any;
  onSelectLabel: (tag: string) => void;
  onSelectList: (id: string, name: string) => void;
}) {
  const hasResults = results.tasks.length > 0 || results.labels.length > 0 || results.lists.length > 0;

  if (!hasResults) {
    return <Text style={[styles.empty, { color: colors.textMuted }]}>No results found.</Text>;
  }

  return (
    <>
      {results.lists.length > 0 && (
        <>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>Lists</Text>
          {results.lists.map((cl) => (
            <TouchableOpacity
              key={cl.id}
              style={[styles.menuRow, { borderBottomColor: colors.border }]}
              onPress={() => onSelectList(cl.id, cl.name)}
              activeOpacity={0.6}
            >
              <Text style={[styles.menuText, { color: colors.text }]}>{cl.name}</Text>
              <Text style={[styles.chevron, { color: colors.textMuted }]}>{'>'}</Text>
            </TouchableOpacity>
          ))}
        </>
      )}

      {results.labels.length > 0 && (
        <>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>Labels</Text>
          {results.labels.map((tag) => (
            <TouchableOpacity
              key={tag}
              style={[styles.menuRow, { borderBottomColor: colors.border }]}
              onPress={() => onSelectLabel(tag)}
              activeOpacity={0.6}
            >
              <Text style={[styles.menuText, { color: colors.text }]}>{tag}</Text>
              <Text style={[styles.chevron, { color: colors.textMuted }]}>{'>'}</Text>
            </TouchableOpacity>
          ))}
        </>
      )}

      {results.tasks.length > 0 && (
        <>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>Tasks</Text>
          {results.tasks.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuRow, { borderBottomColor: colors.border }]}
              onPress={() => navigation.navigate('TaskDetail', { itemId: item.id })}
              activeOpacity={0.6}
            >
              <Text
                style={[
                  styles.menuText,
                  { color: colors.text, flex: 1 },
                  item.completed && { color: colors.textMuted, textDecorationLine: 'line-through' },
                ]}
                numberOfLines={1}
              >
                {item.text}
              </Text>
            </TouchableOpacity>
          ))}
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, marginBottom: 12,
  },
  title: {
    fontSize: 28, fontWeight: '700',
  },
  settingsBtn: { padding: 8 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 20, marginBottom: 16,
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
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
    marginTop: 8, marginBottom: 8,
  },
  taskRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 10, marginVertical: 1,
  },
  taskText: { flex: 1, fontSize: 15, lineHeight: 21 },
  helpLink: { marginTop: 40, alignItems: 'center', paddingVertical: 12 },
  helpText: { fontSize: 14 },
});
