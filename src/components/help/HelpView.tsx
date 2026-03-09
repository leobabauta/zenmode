import { useState } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';
import { cn } from '../../lib/utils';

interface HelpItem {
  q: string;
  a: string;
}

interface HelpSection {
  title: string;
  icon: string;
  items: HelpItem[];
}

const sections: HelpSection[] = [
  {
    title: 'Getting Started',
    icon: 'rocket',
    items: [
      {
        q: 'What is zenmode?',
        a: 'zenmode is a calm, focused task planner built around 5 core principles:\n1. Get clear each morning — start your day with a planning ritual\n2. Focus on today — see only what matters right now\n3. One task at a time — expand any task into a distraction-free focus view\n4. Frictionless capture — jot down ideas in seconds with keyboard shortcuts\n5. Organize on a timeline — your week at a glance, drag tasks between days\nIt strips away the noise so you can focus on what matters.',
      },
      {
        q: 'What are the main views?',
        a: 'zenmode has four main views, each with a keyboard shortcut:\n1. Home / Timeline (H) — see your week at a glance with tasks organized by day\n2. Today (T) — only what you need to focus on right now\n3. Inbox (I) — where new tasks land before you triage them\n4. Later (L) — your someday/maybe list for tasks without a date\nYou can switch between them instantly using the shortcuts above.',
      },
      {
        q: 'How do I add a task?',
        a: 'Press N to open the quick add panel, or use the + Add task button in the sidebar. You can also press Cmd/Ctrl+K to open the command palette and type your task. Tasks go to Today by default — add a date or type "inbox" to send them elsewhere.',
      },
    ],
  },
  {
    title: 'Daily Planning Ritual',
    icon: 'sun',
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
    icon: 'check',
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
    icon: 'folder',
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
    icon: 'keyboard',
    items: [
      {
        q: 'What are the most important shortcuts?',
        a: '• H = Home/Timeline\n• T = Today\n• I = Inbox\n• L = Later\n• N = New task\n• Cmd/Ctrl+K = Command palette\n• M = Move task\n• F = Focus mode\n• R = Recurrence\n• S = Toggle sidebar\n• ? = Show all shortcuts',
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
    icon: 'sync',
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

// Featured docs shown on the landing page
const featuredDocs = [
  { section: 0, item: 0, label: 'Overview' },       // What is zenmode?
  { section: 0, item: 2, label: 'Adding tasks' },    // How do I add a task?
  { section: 1, item: 0, label: 'Daily ritual' },    // What is the Daily Planning Ritual?
  { section: 2, item: 2, label: 'Focus mode' },      // What is Task Focus mode?
  { section: 4, item: 0, label: 'Shortcuts' },       // Most important shortcuts
  { section: 3, item: 0, label: 'Labels & tags' },   // How do labels/hashtags work?
];

const resourceLinks = [
  { title: 'About', href: '/about', description: 'Learn about the zenmode philosophy' },
  { title: 'Manifesto', href: '/manifesto', description: 'Our principles for calm productivity' },
  { title: 'Changelog', href: '/changelog', description: 'Latest updates and improvements' },
];

function SectionIcon({ icon, className }: { icon: string; className?: string }) {
  const cls = cn('w-4 h-4', className);
  switch (icon) {
    case 'rocket':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
        </svg>
      );
    case 'sun':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
        </svg>
      );
    case 'check':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'folder':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        </svg>
      );
    case 'keyboard':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
        </svg>
      );
    case 'sync':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M21.015 4.356v4.992" />
        </svg>
      );
    default:
      return null;
  }
}

function RichText({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let olItems: string[] = [];
  let ulItems: string[] = [];
  let key = 0;

  const flushOl = () => {
    if (olItems.length === 0) return;
    elements.push(
      <ol key={key++} className="list-decimal list-inside space-y-1.5 my-3 text-base text-[var(--color-text-secondary)] leading-relaxed">
        {olItems.map((li, i) => (
          <li key={i}>{li}</li>
        ))}
      </ol>
    );
    olItems = [];
  };

  const flushUl = () => {
    if (ulItems.length === 0) return;
    elements.push(
      <ul key={key++} className="list-disc list-inside space-y-1.5 my-3 text-base text-[var(--color-text-secondary)] leading-relaxed">
        {ulItems.map((li, i) => (
          <li key={i}>{li}</li>
        ))}
      </ul>
    );
    ulItems = [];
  };

  for (const line of lines) {
    const olMatch = line.match(/^\d+\.\s+(.*)/);
    const ulMatch = line.match(/^[•\-]\s*(.*)/);
    if (olMatch) {
      flushUl();
      olItems.push(olMatch[1]);
    } else if (ulMatch) {
      flushOl();
      ulItems.push(ulMatch[1]);
    } else {
      flushOl();
      flushUl();
      if (line.trim()) {
        elements.push(
          <p key={key++} className="text-base text-[var(--color-text-secondary)] leading-relaxed">
            {line}
          </p>
        );
      }
    }
  }
  flushOl();
  flushUl();

  return <div className="space-y-1">{elements}</div>;
}

export function HelpView() {
  const setShowHelp = usePlannerStore((s) => s.setShowHelp);
  // null = landing page, otherwise { section, item } for a specific doc
  const [selected, setSelected] = useState<{ section: number; item: number } | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(
    new Set(sections.map((_, i) => i))
  );

  const toggleSection = (idx: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const selectItem = (sectionIdx: number, itemIdx: number) => {
    setSelected({ section: sectionIdx, item: itemIdx });
    setExpandedSections((prev) => new Set(prev).add(sectionIdx));
  };

  const selectedDoc = selected ? sections[selected.section].items[selected.item] : null;
  const selectedSection = selected ? sections[selected.section] : null;

  return (
    <div className="flex-1 flex overflow-hidden relative">
      {/* Top-right close button */}
      <button
        onClick={() => setShowHelp(false)}
        className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors"
        title="Close support"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Left sidebar */}
      <div className="w-72 flex-shrink-0 border-r border-[var(--color-border)] overflow-y-auto py-5 px-4">
        {/* Back / title */}
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Support</h2>
          <button
            onClick={() => setShowHelp(false)}
            className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors"
            title="Close"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Home link */}
        <button
          onClick={() => setSelected(null)}
          className={cn(
            'w-full text-left px-2 py-2 rounded-md text-base font-medium mb-2 transition-colors',
            selected === null
              ? 'bg-[var(--color-surface)] text-[var(--color-text-primary)]'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]',
          )}
        >
          Home
        </button>

        {/* Topic sections */}
        <nav className="space-y-0.5">
          {sections.map((section, si) => {
            const isExpanded = expandedSections.has(si);
            return (
              <div key={section.title}>
                <button
                  onClick={() => toggleSection(si)}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-base font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors"
                >
                  <SectionIcon icon={section.icon} className="flex-shrink-0 w-4 h-4" />
                  <span className="flex-1 text-left truncate">{section.title}</span>
                  <svg
                    className={cn('w-3 h-3 flex-shrink-0 transition-transform', isExpanded && 'rotate-90')}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                {isExpanded && (
                  <div className="ml-4 pl-2 border-l border-[var(--color-border)] space-y-0.5 mt-0.5 mb-1">
                    {section.items.map((item, ii) => (
                      <button
                        key={item.q}
                        onClick={() => selectItem(si, ii)}
                        className={cn(
                          'w-full text-left px-2 py-1.5 rounded text-sm leading-snug transition-colors',
                          selected?.section === si && selected?.item === ii
                            ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-medium'
                            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]',
                        )}
                      >
                        {item.q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {selectedDoc && selectedSection ? (
          /* Individual doc view */
          <div className="max-w-2xl mx-auto px-8 py-8">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] mb-6">
              <button
                onClick={() => setSelected(null)}
                className="hover:text-[var(--color-text-primary)] transition-colors"
              >
                Support
              </button>
              <span>/</span>
              <span className="text-[var(--color-text-secondary)]">{selectedSection.title}</span>
            </div>

            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-5">
              {selectedDoc.q}
            </h1>
            <RichText text={selectedDoc.a} />

            {/* Navigate within section */}
            <div className="mt-10 pt-6 border-t border-[var(--color-border)]">
              <p className="text-sm font-medium text-[var(--color-text-muted)] mb-3 uppercase tracking-wide">
                More in {selectedSection.title}
              </p>
              <div className="space-y-1">
                {selectedSection.items.map((item, ii) => {
                  if (ii === selected!.item) return null;
                  return (
                    <button
                      key={item.q}
                      onClick={() => selectItem(selected!.section, ii)}
                      className="w-full text-left px-3 py-2 rounded-lg text-base text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)] transition-colors"
                    >
                      {item.q}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Landing page */
          <div className="max-w-3xl mx-auto px-8 py-8">
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-1">
              Support
            </h1>
            <p className="text-base text-[var(--color-text-muted)] mb-8">
              Everything you need to know about zenmode
            </p>

            {/* Popular docs grid */}
            <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">
              Popular docs
            </h2>
            <div className="grid grid-cols-2 gap-3 mb-10">
              {featuredDocs.map((fd) => {
                const doc = sections[fd.section].items[fd.item];
                const section = sections[fd.section];
                return (
                  <button
                    key={fd.label}
                    onClick={() => selectItem(fd.section, fd.item)}
                    className="text-left rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 hover:border-[var(--color-accent)]/40 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <SectionIcon icon={section.icon} className="w-4 h-4 text-[var(--color-text-muted)]" />
                      <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
                        {section.title}
                      </span>
                    </div>
                    <p className="text-base font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors">
                      {fd.label}
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-text-muted)] line-clamp-2 leading-relaxed">
                      {doc.a.slice(0, 100)}...
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Resources */}
            <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">
              Resources
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {resourceLinks.map((link) => (
                <a
                  key={link.title}
                  href={link.href}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 hover:border-[var(--color-accent)]/40 hover:shadow-sm transition-all group"
                >
                  <p className="text-base font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors">
                    {link.title}
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-text-muted)] leading-relaxed">
                    {link.description}
                  </p>
                </a>
              ))}
            </div>

            {/* Browse all topics */}
            <div className="mt-10 pt-6 border-t border-[var(--color-border)]">
              <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-4">
                Browse all topics
              </h2>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                {sections.map((section, si) => (
                  <div key={section.title}>
                    <button
                      onClick={() => {
                        toggleSection(si);
                        selectItem(si, 0);
                      }}
                      className="flex items-center gap-2 text-base font-medium text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition-colors mb-1"
                    >
                      <SectionIcon icon={section.icon} className="w-4 h-4" />
                      {section.title}
                    </button>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      {section.items.length} {section.items.length === 1 ? 'article' : 'articles'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
