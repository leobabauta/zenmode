import { useState, useRef, useEffect } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';
import { Checkbox } from '../ui/Checkbox';
import type { PlannerItem } from '../../types';

interface MobileTaskRowProps {
  item: PlannerItem;
}

export function MobileTaskRow({ item }: MobileTaskRowProps) {
  const updateItem = usePlannerStore((s) => s.updateItem);
  const promptDeleteItem = usePlannerStore((s) => s.promptDeleteItem);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.setSelectionRange(editText.length, editText.length);
    }
  }, [isEditing]);

  const commitEdit = () => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== item.text) updateItem(item.id, { text: trimmed });
    else setEditText(item.text);
    setIsEditing(false);
  };

  return (
    <div className="flex items-center gap-3 px-5 min-h-[44px]">
      {item.type === 'task' && (
        <Checkbox
          checked={item.completed}
          onChange={(checked) => updateItem(item.id, { completed: checked })}
        />
      )}

      <div
        className="flex-1 min-w-0"
        onClick={() => { if (!isEditing) { setEditText(item.text); setIsEditing(true); } }}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
              if (e.key === 'Escape') { setEditText(item.text); setIsEditing(false); }
            }}
            className="w-full bg-transparent text-base text-[var(--color-text-primary)] outline-none"
          />
        ) : (
          <span
            className={`text-base break-words ${
              item.completed
                ? 'line-through text-[var(--color-text-muted)]'
                : 'text-[var(--color-text-primary)]'
            }`}
          >
            {item.text || '\u00A0'}
          </span>
        )}
      </div>

      {isEditing && (
        <button
          onClick={() => promptDeleteItem(item.id)}
          className="flex-shrink-0 p-1 text-[var(--color-text-muted)]"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
