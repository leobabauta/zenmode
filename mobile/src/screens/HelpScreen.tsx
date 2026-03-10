import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useColors } from '../lib/colors';
import Svg, { Path } from 'react-native-svg';

interface HelpItem {
  q: string;
  a: string;
}

interface HelpSection {
  title: string;
  items: HelpItem[];
}

const sections: HelpSection[] = [
  {
    title: 'Getting Started',
    items: [
      {
        q: 'What is zenmode?',
        a: 'zenmode is a calm, focused task planner built around 5 core principles:\n\n1. Get clear each morning — start your day with a planning ritual\n2. Focus on today — see only what matters right now\n3. One task at a time — expand any task into a distraction-free focus view\n4. Frictionless capture — jot down ideas in seconds\n5. Organize on a timeline — your week at a glance, drag tasks between days\n\nIt strips away the noise so you can focus on what matters.',
      },
      {
        q: 'What are the main views?',
        a: 'zenmode has four main views:\n\n1. Today — only what you need to focus on right now\n2. Timeline — see your upcoming tasks organized by day\n3. Inbox — where new tasks land before you triage them\n4. Browse — access Later, Archive, custom lists, labels, and settings',
      },
      {
        q: 'How do I add a task?',
        a: 'Tap the + button in the bottom-right corner to add a new task. Tasks go to Today by default on the Today screen, or to the Inbox on the Inbox screen.',
      },
    ],
  },
  {
    title: 'Daily Planning',
    items: [
      {
        q: 'What is the Daily Planning Ritual?',
        a: "It's a guided morning routine that helps you start your day with intention. You'll triage your inbox, organize your tasks, pick your top priorities, and choose a practice for the day. It takes just a few minutes.",
      },
      {
        q: 'What are priorities?',
        a: 'You can star up to 3 top priorities (gold stars) and 3 medium priorities (blue stars). These help you stay focused on what matters most. Starred tasks appear highlighted in your Today view.',
      },
    ],
  },
  {
    title: 'Managing Tasks',
    items: [
      {
        q: 'How do I move a task to a different day?',
        a: 'Swipe a task to the right to snooze it to tomorrow. You can also open the task detail and change its date from there. In the Timeline view on the web, you can drag tasks between days.',
      },
      {
        q: 'How do I delete a task?',
        a: 'Swipe a task to the left to delete it. A toast notification appears with an Undo option in case you change your mind.',
      },
      {
        q: 'What is Task Focus mode?',
        a: 'Tap any task to open its detail view. You\'ll see the task with its subtasks, notes, and a Focus Timer button. This helps you concentrate on one thing at a time.',
      },
      {
        q: 'How does the Focus Timer work?',
        a: 'On the task detail screen, tap the Focus button to reveal a visual countdown timer. Set your duration and press Start. When the timer completes, the task is automatically checked off with a celebration.',
      },
      {
        q: 'How do subtasks work?',
        a: 'In the task detail view, you can add subtasks. Subtasks have their own checkboxes and help break down larger tasks into manageable pieces.',
      },
      {
        q: 'What is the Archive?',
        a: 'Completed tasks can be archived to keep your lists clean. View archived items from the Browse screen by tapping Archive.',
      },
    ],
  },
  {
    title: 'Organization',
    items: [
      {
        q: 'How do labels/hashtags work?',
        a: 'Add #hashtags to any task text (e.g. "Review proposal #work"). Labels appear automatically in the Browse screen. Tap a label to filter tasks by that tag.',
      },
      {
        q: 'What are Lists?',
        a: 'Lists are custom collections for grouping related tasks (e.g. "Shopping", "Project X"). Access your lists from the Browse screen.',
      },
      {
        q: 'How does the Inbox work?',
        a: "The Inbox catches tasks that don't have a date yet. It's a holding area for new ideas and incoming items. Triage your inbox by moving items to Today, Tomorrow, or Later.",
      },
      {
        q: 'What is the Later list?',
        a: 'Later is for tasks you want to do eventually but not this week. Think of it as your someday/maybe list. Access it from the Browse screen.',
      },
    ],
  },
  {
    title: 'Gestures',
    items: [
      {
        q: 'What gestures are available?',
        a: 'On task lists:\n\n• Swipe left — delete the task\n• Swipe right — snooze to tomorrow\n• Long press — drag to reorder\n• Tap — open task detail',
      },
      {
        q: 'How do I reorder tasks?',
        a: 'Long press on any task to pick it up, then drag it to the desired position. Release to drop it in place.',
      },
    ],
  },
  {
    title: 'Syncing & Settings',
    items: [
      {
        q: 'How does syncing work?',
        a: 'zenmode syncs automatically across all your devices when you\'re signed in. Changes push to the cloud within seconds and pull down in real-time. Your data is stored securely.',
      },
      {
        q: 'Can I email tasks to zenmode?',
        a: 'Yes! Send an email to your zenmode inbox address and it will appear as a task. The subject line becomes the task title.',
      },
      {
        q: 'How do I change the theme?',
        a: 'Go to Settings (gear icon on the Browse screen) to toggle between light and dark mode. Your preference syncs across devices.',
      },
    ],
  },
];

function ChevronIcon({ color, rotated }: { color: string; rotated: boolean }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" style={rotated ? { transform: [{ rotate: '90deg' }] } : undefined}>
      <Path d="M8.25 4.5l7.5 7.5-7.5 7.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function HelpScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [selectedItem, setSelectedItem] = useState<{ section: number; item: number } | null>(null);

  const toggleSection = (idx: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const selectItem = (si: number, ii: number) => {
    setSelectedItem({ section: si, item: ii });
  };

  // Detail view for a selected article
  if (selectedItem) {
    const section = sections[selectedItem.section];
    const article = section.items[selectedItem.item];
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setSelectedItem(null)}
          activeOpacity={0.6}
        >
          <Text style={[styles.backText, { color: colors.accent }]}>{'< Help'}</Text>
        </TouchableOpacity>
        <ScrollView contentContainerStyle={styles.articleContent}>
          <Text style={[styles.articleSectionLabel, { color: colors.textMuted }]}>
            {section.title}
          </Text>
          <Text style={[styles.articleTitle, { color: colors.text }]}>{article.q}</Text>
          <Text style={[styles.articleBody, { color: colors.textSecondary }]}>{article.a}</Text>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        activeOpacity={0.6}
      >
        <Text style={[styles.backText, { color: colors.accent }]}>{'< Browse'}</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.title, { color: colors.text }]}>Help</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Everything you need to know about zenmode
        </Text>

        {sections.map((section, si) => {
          const isExpanded = expanded.has(si);
          return (
            <View key={section.title} style={styles.sectionBlock}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => toggleSection(si)}
                activeOpacity={0.6}
              >
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
                <ChevronIcon color={colors.textMuted} rotated={isExpanded} />
              </TouchableOpacity>

              {isExpanded &&
                section.items.map((item, ii) => (
                  <TouchableOpacity
                    key={item.q}
                    style={styles.articleRow}
                    onPress={() => selectItem(si, ii)}
                    activeOpacity={0.6}
                  >
                    <Text style={[styles.articleQuestion, { color: colors.textSecondary }]}>
                      {item.q}
                    </Text>
                    <ChevronIcon color={colors.textMuted} rotated={false} />
                  </TouchableOpacity>
                ))}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backButton: { paddingHorizontal: 20, paddingTop: 12 },
  backText: { fontSize: 16 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 60 },
  title: { fontSize: 40, fontWeight: '700', paddingTop: 12, marginBottom: 4 },
  subtitle: { fontSize: 15, marginBottom: 28 },

  sectionBlock: { marginBottom: 8 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  sectionTitle: { fontSize: 17, fontWeight: '600' },

  articleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingLeft: 12,
  },
  articleQuestion: { fontSize: 15, flex: 1, marginRight: 8 },

  // Article detail view
  articleContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 60 },
  articleSectionLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  articleTitle: { fontSize: 24, fontWeight: '700', marginBottom: 16 },
  articleBody: { fontSize: 15, lineHeight: 24 },
});
