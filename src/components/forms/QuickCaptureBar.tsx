import { usePlannerStore } from '../../store/usePlannerStore';
import { cn } from '../../lib/utils';

export function QuickCaptureBar() {
  const setShowCommandPalette = usePlannerStore((s) => s.setShowCommandPalette);
  const setCommandPaletteAddTask = usePlannerStore((s) => s.setCommandPaletteAddTask);

  return (
    <button
      onClick={() => {
        setCommandPaletteAddTask(true);
        setShowCommandPalette(true);
      }}
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2',
        'flex items-center gap-2 px-4 py-2.5 rounded-full',
        'bg-[var(--color-surface)] border border-[var(--color-border)]',
        'text-sm text-[var(--color-text-secondary)]',
        'shadow-lg hover:shadow-xl transition-shadow duration-200',
        'hover:border-accent hover:text-[var(--color-text-primary)]'
      )}
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
      Quick capture
      <kbd className="ml-1 text-[10px] bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-1 py-0.5 text-[var(--color-text-muted)]">N</kbd>
    </button>
  );
}
