import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { TaskItem } from './TaskItem';
import { NoteItem } from './NoteItem';
import { cn } from '../../lib/utils';
import type { PlannerItem } from '../../types';

interface DraggableItemProps {
  item: PlannerItem;
  isSelected?: boolean;
  isFocused?: boolean;
  onSelect?: () => void;
  onExtendSelection?: () => void;
  onDeselect?: () => void;
  onSelectPrev?: (cursorX?: number) => void;
  onSelectNext?: (cursorX?: number) => void;
  onShiftSelectPrev?: () => void;
  onShiftSelectNext?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onInsertAfter?: (text: string) => void;
  onDeleteAndFocusPrev?: () => void;
  onToggleCollapse?: () => void;
  isCollapsed?: boolean;
}

export function DraggableItem({
  item, isSelected, isFocused,
  onSelect, onExtendSelection, onDeselect,
  onSelectPrev, onSelectNext,
  onShiftSelectPrev, onShiftSelectNext,
  onMoveUp, onMoveDown, onInsertAfter, onDeleteAndFocusPrev,
  onToggleCollapse, isCollapsed,
}: DraggableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  // Droppable zone for "drop task onto this task to make subtask"
  const { setNodeRef: setDropRef, isOver: isDropOver } = useDroppable({ id: `subtask-${item.id}` });

  const mergedRef = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    setDropRef(node);
  };

  const sharedProps = {
    item, isDragging, isSelected, isFocused,
    onSelect, onExtendSelection, onDeselect,
    onSelectPrev, onSelectNext,
    onShiftSelectPrev, onShiftSelectNext,
    onMoveUp, onMoveDown, onInsertAfter, onDeleteAndFocusPrev,
    onToggleCollapse, isCollapsed,
  };

  const dragHandleProps = { ...attributes, ...listeners };

  return (
    <div
      ref={mergedRef}
      style={{ transform: CSS.Transform.toString(transform), transition: transition ?? 'transform 250ms ease' }}
      className={cn('touch-none', isDragging && 'z-10 relative', isDropOver && !isDragging && 'ring-2 ring-blue-500/50 bg-blue-500/10 rounded-lg')}
    >
      {item.type === 'task'
        ? <TaskItem {...sharedProps} dragHandleProps={dragHandleProps} />
        : <NoteItem {...sharedProps} dragHandleProps={dragHandleProps} />}
    </div>
  );
}
