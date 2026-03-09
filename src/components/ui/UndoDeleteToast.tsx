import { useEffect, useState } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';

export function UndoDeleteToast() {
  const lastDeletedItems = usePlannerStore((s) => s.lastDeletedItems);
  const undoDelete = usePlannerStore((s) => s.undoDelete);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (lastDeletedItems && lastDeletedItems.length > 0) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        // Clear after fade out
        setTimeout(() => {
          usePlannerStore.setState({ lastDeletedItems: null });
        }, 300);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [lastDeletedItems]);

  const handleUndo = () => {
    undoDelete();
    setVisible(false);
  };

  if (!lastDeletedItems || lastDeletedItems.length === 0) return null;

  const parentItem = lastDeletedItems.find((i) => !i.parentId) ?? lastDeletedItems[0];
  const taskText = parentItem.text.length > 40
    ? parentItem.text.slice(0, 40) + '...'
    : parentItem.text;

  return (
    <div
      className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
      }`}
    >
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[var(--color-text-primary)] text-[var(--color-bg)] shadow-lg">
        <span className="text-sm">
          Deleted "{taskText}"
        </span>
        <button
          onClick={handleUndo}
          className="text-sm font-semibold text-amber-400 hover:text-amber-300 transition-colors"
        >
          Undo
        </button>
      </div>
    </div>
  );
}
