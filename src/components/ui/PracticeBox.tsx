import { useState, useRef, useEffect } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';
import { cn } from '../../lib/utils';
import type { PlannerItem } from '../../types';

interface PracticeBoxProps {
  items: PlannerItem[];
  className?: string;
}

export function PracticeBox({ items, className }: PracticeBoxProps) {
  const updateItem = usePlannerStore((s) => s.updateItem);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const startEditing = (item: PlannerItem) => {
    setEditingId(item.id);
    setEditText(item.text);
  };

  const commitEdit = () => {
    if (editingId) {
      const trimmed = editText.trim();
      if (trimmed) {
        updateItem(editingId, { text: trimmed });
      }
      setEditingId(null);
    }
  };

  return (
    <div className={cn('rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 flex items-center gap-2', className)}>
      <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex-shrink-0">
        Practice
      </span>
      <div className="flex-1 min-w-0">
        {items.map((item, i) => (
          <span key={item.id}>
            {editingId === item.id ? (
              <input
                ref={inputRef}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
                  if (e.key === 'Escape') { setEditingId(null); }
                }}
                className="bg-transparent text-sm text-[var(--color-text-primary)] outline-none w-full"
              />
            ) : (
              <span
                onClick={() => startEditing(item)}
                className="text-sm text-[var(--color-text-primary)] cursor-text hover:underline decoration-amber-400/40"
              >
                {item.text}
                {i < items.length - 1 && ', '}
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
