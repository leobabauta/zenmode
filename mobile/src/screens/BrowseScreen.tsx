import { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Pressable, StyleSheet, Linking as RNLinking, Platform, Vibration, RefreshControl, ScrollView } from 'react-native';
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
import { AddTaskFAB, type AddDestination } from '../components/AddTaskFAB';
import { useToast } from '../components/Toast';
import { useColors, type Colors } from '../lib/colors';
import { pullFromSupabase, pullPreferences } from '../../../shared/lib/sync';
import { parseReminder } from '../../../shared/lib/reminderParser';
import { scheduleReminderNotification } from '../lib/notifications';
import Svg, { Path, Circle } from 'react-native-svg';
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

type SubView =
  | { kind: 'later' }
  | { kind: 'archive' }
  | { kind: 'customList'; listId: string; listName: string }
  | { kind: 'label'; tag: string };

function SettingsIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function SearchIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function HelpIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function HashIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5l-3.9 19.5m-2.1-19.5l-3.9 19.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
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

  const handleMoveToInbox = () => {
    const prevDayKey = item.dayKey;
    const prevIsLater = item.isLater;
    moveItem(item.id, null, false);
    show('Moved to Inbox', () => { moveItem(item.id, prevDayKey, prevIsLater); });
  };

  return (
    <ScaleDecorator>
      <SwipeableRow onTomorrow={handleTomorrow} onMoveToInbox={handleMoveToInbox} onDelete={handleDelete} enabled={!isActive}>
        <Pressable onPress={() => navigation.navigate('TaskDetail', { itemId: item.id })} onLongPress={drag} disabled={isActive}>
          <View style={[styles.taskRow, { backgroundColor: isActive ? colors.surface : colors.bg }]}>
            <Checkbox checked={!!item.completed} onChange={(checked) => updateItem(item.id, { completed: checked })} colors={colors} />
            <Text style={[styles.taskText, { color: colors.text }, item.completed && { color: colors.textMuted, textDecorationLine: 'line-through' }]} numberOfLines={2}>{item.text}</Text>
            <PriorityStar isPriority={item.isPriority} isMediumPriority={item.isMediumPriority} colors={colors} />
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
      case 'later': return all.filter((i) => i.dayKey === null && i.isLater === true && !i.isArchived && !i.parentId).sort((a, b) => a.order - b.order);
      case 'archive': return all.filter((i) => i.isArchived && !i.parentId).sort((a, b) => a.order - b.order);
      case 'customList': return all.filter((i) => i.listId === subView.listId && !i.parentId && !i.isArchived).sort((a, b) => a.order - b.order);
      case 'label': {
        const pattern = new RegExp(subView.tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        return all.filter((i) => pattern.test(i.text)).sort((a, b) => a.order - b.order);
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
      if (matches) for (const m of matches) tags.add(m.toLowerCase());
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
    return {
      tasks: Object.values(items).filter((i) => !i.parentId && !i.isArchived && i.text.toLowerCase().includes(q)).sort((a, b) => a.order - b.order).slice(0, 15),
      labels: allLabels.filter((l) => l.includes(q)),
      lists: customLists.filter((cl) => cl.name.toLowerCase().includes(q)).sort((a, b) => a.order - b.order),
    };
  }, [items, customLists, allLabels, query]);
}

function subViewTitle(subView: SubView): string {
  switch (subView.kind) {
    case 'later': return 'Later';
    case 'archive': return 'Archive';
    case 'customList': return subView.listName;
    case 'label': return subView.tag;
  }
}

export function BrowseScreen() {
  const [subView, setSubView] = useState<SubView | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const customLists = usePlannerStore((s) => s.customLists);
  const addItem = usePlannerStore((s) => s.addItem);
  const setRecurrence = usePlannerStore((s) => s.setRecurrence);
  const reorderItems = usePlannerStore((s) => s.reorderItems);
  const labels = useAllLabels();
  const filteredItems = useFilteredItems(subView);
  const searchResults = useSearchResults(searchQuery);
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const navigation = useNavigation<any>();
  const { show } = useToast();
  const isSearching = searchQuery.trim().length > 0;
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

  // Reset sub-view when user taps the Browse tab again
  useEffect(() => {
    const parent = navigation.getParent();
    if (!parent) return;
    const unsubscribe = parent.addListener('tabPress', () => {
      setSubView(null);
    });
    return unsubscribe;
  }, [navigation]);

  const todayKey = toDayKey(new Date());

  // Determine default destination based on current sub-view
  const defaultDestination: AddDestination = subView
    ? subView.kind === 'customList'
      ? { listId: subView.listId, listName: subView.listName }
      : subView.kind === 'later'
        ? 'inbox'
        : 'today'
    : 'today';

  const handleAdd = (text: string, destination: AddDestination) => {
    const reminder = parseReminder(text);
    if (reminder) {
      const reminderDate = new Date(reminder.reminderAt);
      const dayKey = `${reminderDate.getFullYear()}-${String(reminderDate.getMonth() + 1).padStart(2, '0')}-${String(reminderDate.getDate()).padStart(2, '0')}`;
      addItem({ type: 'task', text: reminder.cleanText, dayKey, reminderAt: reminder.reminderAt });
      if (reminder.recurrence) {
        const allItems = usePlannerStore.getState().items;
        const newItem = Object.values(allItems).find(
          (i) => i.text === reminder.cleanText && i.dayKey === dayKey && i.reminderAt === reminder.reminderAt
        );
        if (newItem) setRecurrence(newItem.id, reminder.recurrence);
      }
      scheduleReminderNotification(`new-${Date.now()}`, reminder.cleanText, reminder.reminderAt);
      const timeStr = reminderDate.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
      const recurLabel = reminder.recurrence ? ' (recurring)' : '';
      show(`Reminder set for ${timeStr}${recurLabel}`);
      return;
    }
    if (destination === 'today') {
      addItem({ type: 'task', text, dayKey: todayKey });
    } else if (destination === 'inbox') {
      addItem({ type: 'task', text, dayKey: null });
    } else {
      addItem({ type: 'task', text, dayKey: null, listId: destination.listId });
    }
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
        <Text style={[styles.subViewTitle, { color: colors.text }]}>{subViewTitle(subView)}</Text>
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} />}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
        <DraggableFlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onDragEnd={handleDragEnd}
          onDragBegin={triggerHapticMedium}
          onPlaceholderIndexChange={triggerHaptic}
          contentContainerStyle={styles.list}
          scrollEnabled={false}
          ListEmptyComponent={<Text style={[styles.empty, { color: colors.textMuted }]}>No items.</Text>}
        />
        </ScrollView>
        <AddTaskFAB colors={colors} defaultDestination={defaultDestination} onAdd={handleAdd} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      <FlatList
        data={[]}
        keyExtractor={() => ''}
        renderItem={() => null}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} />}
        ListHeaderComponent={
          <>
            {/* Profile header */}
            <View style={styles.profileRow}>
              <View style={styles.profileLeft}>
                <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
                  <Text style={styles.avatarText}>Z</Text>
                </View>
                <Text style={[styles.profileName, { color: colors.text }]}>zenmode</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.settingsBtn} hitSlop={12}>
                <SettingsIcon color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Search row */}
            <TouchableOpacity
              style={[styles.searchRow, searchFocused && { borderColor: colors.accent }]}
              activeOpacity={1}
              onPress={() => setSearchFocused(true)}
            >
              <SearchIcon color={isSearching ? colors.accent : colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search"
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
                  <Text style={{ color: colors.textMuted, fontSize: 18, fontWeight: '300' }}>x</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            {isSearching ? (
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
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Lists</Text>

                <MenuItem label="Later" colors={colors} onPress={() => setSubView({ kind: 'later' })} />
                <MenuItem label="Archive" colors={colors} onPress={() => setSubView({ kind: 'archive' })} />
                {customLists.slice().sort((a, b) => a.order - b.order).map((cl) => (
                  <MenuItem key={cl.id} label={cl.name} colors={colors} onPress={() => setSubView({ kind: 'customList', listId: cl.id, listName: cl.name })} />
                ))}

                {/* Labels section */}
                {labels.length > 0 && (
                  <>
                    <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 28 }]}>Labels</Text>
                    {labels.map((tag) => (
                      <TouchableOpacity
                        key={tag}
                        style={styles.menuItem}
                        onPress={() => setSubView({ kind: 'label', tag })}
                        activeOpacity={0.6}
                      >
                        <HashIcon color={colors.accent} />
                        <Text style={[styles.menuLabel, { color: colors.text }]}>{tag}</Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}

                {/* Bottom links */}
                <View style={styles.bottomLinks}>
                  <TouchableOpacity style={styles.bottomLink} activeOpacity={0.6} onPress={() => navigation.navigate('Help')}>
                    <HelpIcon color={colors.textMuted} />
                    <Text style={[styles.bottomLinkText, { color: colors.textMuted }]}>Help & resources</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </>
        }
      />
      <AddTaskFAB colors={colors} defaultDestination={defaultDestination} onAdd={handleAdd} />
    </View>
  );
}

function MenuItem({ label, colors, onPress }: { label: string; colors: Colors; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.6}>
      <Text style={[styles.menuLabel, { color: colors.text }]}>{label}</Text>
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
        <Path d="M8.25 4.5l7.5 7.5-7.5 7.5" stroke={colors.textMuted} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </TouchableOpacity>
  );
}

function SearchResultsView({
  results, colors, navigation, onSelectLabel, onSelectList,
}: {
  results: { tasks: PlannerItem[]; labels: string[]; lists: { id: string; name: string }[] };
  colors: Colors;
  navigation: any;
  onSelectLabel: (tag: string) => void;
  onSelectList: (id: string, name: string) => void;
}) {
  const hasResults = results.tasks.length > 0 || results.labels.length > 0 || results.lists.length > 0;
  if (!hasResults) return <Text style={[styles.empty, { color: colors.textMuted }]}>No results found.</Text>;

  return (
    <>
      {results.lists.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Lists</Text>
          {results.lists.map((cl) => (
            <MenuItem key={cl.id} label={cl.name} colors={colors} onPress={() => onSelectList(cl.id, cl.name)} />
          ))}
        </>
      )}
      {results.labels.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Labels</Text>
          {results.labels.map((tag) => (
            <TouchableOpacity key={tag} style={styles.menuItem} onPress={() => onSelectLabel(tag)} activeOpacity={0.6}>
              <HashIcon color={colors.accent} />
              <Text style={[styles.menuLabel, { color: colors.text }]}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </>
      )}
      {results.tasks.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Tasks</Text>
          {results.tasks.map((item) => (
            <TouchableOpacity key={item.id} style={styles.menuItem} onPress={() => navigation.navigate('TaskDetail', { itemId: item.id })} activeOpacity={0.6}>
              <Text style={[styles.menuLabel, { color: colors.text, flex: 1 }, item.completed && { color: colors.textMuted, textDecorationLine: 'line-through' }]} numberOfLines={1}>{item.text}</Text>
            </TouchableOpacity>
          ))}
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },

  // Profile header
  profileRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 16, marginBottom: 20,
  },
  profileLeft: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  profileName: { fontSize: 22, fontWeight: '700' },
  settingsBtn: { padding: 4 },

  // Search
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 11,
    borderRadius: 10, borderWidth: 1, borderColor: 'transparent',
    backgroundColor: 'rgba(128,128,128,0.08)',
    marginBottom: 24,
  },
  searchInput: { flex: 1, fontSize: 16, marginLeft: 10, padding: 0 },

  // Sections
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },

  // Menu items
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 13, gap: 12,
  },
  menuLabel: { fontSize: 15, flex: 1 },

  // Bottom links
  bottomLinks: { marginTop: 36, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(128,128,128,0.15)' },
  bottomLink: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, gap: 12 },
  bottomLinkText: { fontSize: 15 },

  // Sub-view
  subViewTitle: { fontSize: 40, fontWeight: '700', paddingHorizontal: 20, paddingTop: 20, marginBottom: 16 },
  list: { paddingHorizontal: 12, paddingBottom: 80 },
  empty: { fontSize: 14, textAlign: 'center', marginTop: 40 },
  // Task rows (sub-view)
  taskRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 10, marginVertical: 1,
  },
  taskText: { flex: 1, fontSize: 15, lineHeight: 21 },
});
