import { useState, useRef, useEffect } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';
import { cn } from '../../lib/utils';

export function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const setShowSettings = usePlannerStore((s) => s.setShowSettings);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        aria-label="Profile menu"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'p-1.5 rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
          'hover:bg-[var(--color-surface)] transition-colors duration-150',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        )}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-44 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg shadow-lg overflow-hidden">
          <button
            disabled
            className="w-full text-left px-4 py-2 text-sm text-[var(--color-text-muted)] cursor-not-allowed"
          >
            Profile
          </button>
          <button
            onClick={() => { setOpen(false); setShowSettings(true); }}
            className="w-full text-left px-4 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors"
          >
            Settings
          </button>
          <button
            disabled
            className="w-full text-left px-4 py-2 text-sm text-[var(--color-text-muted)] cursor-not-allowed"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
