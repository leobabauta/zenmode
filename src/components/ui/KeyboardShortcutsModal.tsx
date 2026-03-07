import { useEffect } from 'react';

interface KeyboardShortcutsModalProps {
  onClose: () => void;
}

const SECTIONS = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: 'H', desc: 'Home (Timeline)' },
      { keys: 'T', desc: 'Today' },
      { keys: 'I', desc: 'Inbox' },
      { keys: 'L', desc: 'Later' },
      { keys: 'A', desc: 'Archive' },
      { keys: 'S', desc: 'Stats' },
      { keys: 'F', desc: 'Toggle sidebar' },
    ],
  },
  {
    title: 'Actions',
    shortcuts: [
      { keys: 'N', desc: 'New task' },
      { keys: '\u2318K', desc: 'Command palette' },
    ],
  },
  {
    title: 'Task editing',
    shortcuts: [
      { keys: 'Enter', desc: 'Edit task / new line' },
      { keys: 'Esc', desc: 'Stop editing / deselect' },
      { keys: '\u2191 \u2193', desc: 'Navigate tasks' },
      { keys: 'dd', desc: 'Delete task' },
      { keys: 'J', desc: 'Move task down' },
      { keys: 'K', desc: 'Move task up' },
      { keys: 'M', desc: 'Move task to day' },
      { keys: 'Shift+I', desc: 'Send to Inbox' },
      { keys: 'Shift+E', desc: 'Send to Later' },
      { keys: '⌥+Drag', desc: 'Drop onto task to make subtask' },
    ],
  },
];

export function KeyboardShortcutsModal({ onClose }: KeyboardShortcutsModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] max-h-[80vh] overflow-y-auto bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl shadow-2xl z-50 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Keyboard Shortcuts</h2>
          <button onClick={onClose} className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {SECTIONS.map((section) => (
          <div key={section.title} className="mb-4">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.shortcuts.map((s) => (
                <div key={s.keys} className="flex items-center justify-between py-1">
                  <span className="text-sm text-[var(--color-text-secondary)]">{s.desc}</span>
                  <kbd className="text-xs bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1.5 py-0.5 text-[var(--color-text-muted)] font-mono">
                    {s.keys}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
