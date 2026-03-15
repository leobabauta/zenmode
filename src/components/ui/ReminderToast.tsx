import { useEffect, useState } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';

export function ReminderToast() {
  const reminderToast = usePlannerStore((s) => s.reminderToast);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (reminderToast) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(() => {
          usePlannerStore.setState({ reminderToast: null });
        }, 300);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [reminderToast]);

  if (!reminderToast) return null;

  return (
    <div
      className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
      }`}
    >
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-text-primary)] text-[var(--color-bg)] shadow-lg">
        <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        <span className="text-sm">{reminderToast}</span>
      </div>
    </div>
  );
}
