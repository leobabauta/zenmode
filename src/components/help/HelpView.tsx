import { useState } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';
import { cn } from '../../lib/utils';

interface HelpSection {
  title: string;
  items: { q: string; a: string }[];
}

const sections: HelpSection[] = [
  {
    title: 'Getting Started',
    items: [
      {
        q: 'What is zenmode?',
        a: 'zenmode is a calm, focused task planner built around 5 principles: get clear each morning, focus on today, tackle one task at a time, capture ideas frictionlessly, and organize on a timeline. It strips away the noise so you can focus on what matters.',
      },
      {
        q: 'What are the main views?',
        a: 'Home (Timeline) shows your week at a glance. Today shows only what you need to focus on right now. Inbox is where new tasks land. Later is for someday/maybe items. You can switch views with keyboard shortcuts: H for Home, T for Today, I for Inbox, L for Later.',
      },
      {
        q: 'How do I add a task?',
        a: 'Press N to open the quick add panel, or use the + Add task button in the sidebar. You can also press Cmd/Ctrl+K to open the command palette and type your task. Tasks go to Today by default — add a date or type "inbox" to send them elsewhere.',
      },
    ],
  },
  {
    title: 'Daily Planning Ritual',
    items: [
      {
        q: 'What is the Daily Planning Ritual?',
        a: 'It\'s a guided morning routine that helps you start your day with intention. You\'ll triage your inbox, import calendar events, organize your tasks, pick your top priorities, and choose a practice for the day. It takes just a few minutes.',
      },
      {
        q: 'How do I start the ritual?',
        a: 'If you have planning rituals enabled (Settings), zenmode will prompt you each morning. You can also trigger it from the command palette (Cmd/Ctrl+K) by searching for "ritual".',
      },
      {
        q: 'What are priorities and medium priorities?',
        a: 'During the ritual, you can star up to 3 top priorities (gold stars) and 3 medium priorities (blue stars). These help you stay focused on what matters most. Starred tasks appear highlighted in your Today view.',
      },
    ],
  },
  {
    title: 'Managing Tasks',
    items: [
      {
        q: 'How do I move a task to a different day?',
        a: 'Select a task and press M to open the move modal. You can pick any date, or use Tomorrow/Later shortcuts. You can also drag tasks between days in the Timeline view.',
      },
      {
        q: 'How do I make a task recurring?',
        a: 'Select a task and press R to set a recurrence pattern. You can choose daily, weekdays, weekly, or custom intervals. When you complete a recurring task, the next occurrence is automatically created.',
      },
      {
        q: 'What is Task Focus mode?',
        a: 'Press F on any task (or click the expand icon) to enter Task Focus mode. Everything else disappears, leaving just your task with its subtasks, notes, and an optional focus timer. Press Esc to exit.',
      },
      {
        q: 'How do subtasks work?',
        a: 'In Task Focus mode (or the expanded task view), you can add subtasks by typing in the text area. Press Enter to add each subtask. Subtasks have their own checkboxes and can be reordered.',
      },
      {
        q: 'How do I delete a task?',
        a: 'Select a task and press D twice (DD) to delete it. You can also click the X icon that appears on hover. Deleted tasks are removed permanently.',
      },
      {
        q: 'What is the Archive?',
        a: 'Completed tasks can be archived to keep your lists clean. Use the "Archive completed" option from the command palette or the archive action. View archived items by pressing A or clicking Archive in the sidebar.',
      },
    ],
  },
  {
    title: 'Organization',
    items: [
      {
        q: 'How do labels/hashtags work?',
        a: 'Add #hashtags to any task text (e.g. "Review proposal #work"). Labels appear automatically in the sidebar. Click a label to filter tasks by that tag. You can change label colors and rename them from the sidebar context menu.',
      },
      {
        q: 'What are Lists?',
        a: 'Lists are custom collections for grouping related tasks (e.g. "Shopping", "Project X"). Create a new list from the sidebar. You can drag tasks into lists from the sidebar drop targets.',
      },
      {
        q: 'How does the Inbox work?',
        a: 'The Inbox catches tasks that don\'t have a date yet. It\'s a holding area for new ideas and incoming items. During your daily ritual, you triage your inbox by moving items to Today, Tomorrow, or Later.',
      },
      {
        q: 'What is the Later list?',
        a: 'Later is for tasks you want to do eventually but not this week. Items that get moved too many times automatically go to Later. Think of it as your someday/maybe list.',
      },
    ],
  },
  {
    title: 'Keyboard Shortcuts',
    items: [
      {
        q: 'What are the most important shortcuts?',
        a: 'H = Home/Timeline, T = Today, I = Inbox, L = Later, N = New task, Cmd/Ctrl+K = Command palette, M = Move task, F = Focus mode, R = Recurrence, S = Toggle sidebar, ? = Show all shortcuts.',
      },
      {
        q: 'How does the Command Palette work?',
        a: 'Press Cmd/Ctrl+K to open it. You can search for any task, navigate to views, or trigger actions. Press N to open it in add-task mode, where you can quickly create tasks with natural language dates.',
      },
      {
        q: 'How does Quick Capture work?',
        a: 'The Quick Capture bar sits at the bottom of the screen. Click it or use the Cmd/Ctrl+K shortcut. Type your task and press Enter — it goes straight to your inbox or today depending on context.',
      },
    ],
  },
  {
    title: 'Syncing & Settings',
    items: [
      {
        q: 'How does syncing work?',
        a: 'zenmode syncs automatically across all your devices when you\'re signed in. Changes push to the cloud within seconds and pull down in real-time via WebSocket. Your data is stored securely in Supabase.',
      },
      {
        q: 'Can I email tasks to zenmode?',
        a: 'Yes! Send an email to your zenmode inbox address and it will appear as a task. The subject line becomes the task title and the email body becomes the task notes.',
      },
      {
        q: 'How do I change the theme?',
        a: 'Click the sun/moon icon in the top-right corner to toggle between light and dark mode. Your preference syncs across devices.',
      },
      {
        q: 'How do I configure rituals?',
        a: 'Go to Settings to enable/disable the Daily Planning Ritual and Daily Review Ritual. You can also set the preferred hour for each ritual prompt.',
      },
    ],
  },
];

function Accordion({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-[var(--color-border)] last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 py-3 text-left text-sm font-medium text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition-colors"
      >
        <span>{q}</span>
        <svg
          className={cn('w-4 h-4 flex-shrink-0 text-[var(--color-text-muted)] transition-transform', open && 'rotate-180')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <p className="pb-3 text-sm text-[var(--color-text-secondary)] leading-relaxed">
          {a}
        </p>
      )}
    </div>
  );
}

export function HelpView() {
  const setShowHelp = usePlannerStore((s) => s.setShowHelp);
  const [activeSection, setActiveSection] = useState(0);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Support</h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              Everything you need to know about zenmode
            </p>
          </div>
          <button
            onClick={() => setShowHelp(false)}
            className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Section tabs */}
        <div className="flex gap-2 flex-wrap mb-8">
          {sections.map((section, i) => (
            <button
              key={section.title}
              onClick={() => setActiveSection(i)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                i === activeSection
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
              )}
            >
              {section.title}
            </button>
          ))}
        </div>

        {/* Active section */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-5">
          {sections[activeSection].items.map((item) => (
            <Accordion key={item.q} q={item.q} a={item.a} />
          ))}
        </div>

        {/* Footer links */}
        <div className="mt-8 pt-6 border-t border-[var(--color-border)] text-center">
          <p className="text-sm text-[var(--color-text-muted)]">
            Need more help? Check the{' '}
            <a href="/about" className="text-[var(--color-accent)] hover:underline">About</a>
            {' '}page, read the{' '}
            <a href="/manifesto" className="text-[var(--color-accent)] hover:underline">Manifesto</a>
            , or view the{' '}
            <a href="/changelog" className="text-[var(--color-accent)] hover:underline">Changelog</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
