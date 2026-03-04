import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useShallow } from 'zustand/react/shallow';
import { DraggableItem } from './DraggableItem';
import { usePlannerStore } from '../../store/usePlannerStore';
import { setPendingEditX } from '../../lib/editNavigation';
import type { PlannerItem } from '../../types';

interface ItemListProps {
  items: PlannerItem[];
  onCrossPrev?: (cursorX?: number) => void;
  onCrossNext?: (cursorX?: number) => void;
}

/** Swap the element just above the selected block to just below it. */
function moveGroupUp(ids: string[], selectedSet: Set<string>): string[] | null {
  const firstIdx = ids.findIndex((id) => selectedSet.has(id));
  if (firstIdx <= 0) return null;
  const lastIdx = ids.reduce((acc, id, i) => (selectedSet.has(id) ? i : acc), -1);
  const next = [...ids];
  const displaced = next.splice(firstIdx - 1, 1)[0];
  next.splice(lastIdx, 0, displaced); // lastIdx is now one past the last selected
  return next;
}

/** Swap the element just below the selected block to just above it. */
function moveGroupDown(ids: string[], selectedSet: Set<string>): string[] | null {
  const lastIdx = ids.reduce((acc, id, i) => (selectedSet.has(id) ? i : acc), -1);
  if (lastIdx >= ids.length - 1) return null;
  const firstIdx = ids.findIndex((id) => selectedSet.has(id));
  const next = [...ids];
  const displaced = next.splice(lastIdx + 1, 1)[0];
  next.splice(firstIdx, 0, displaced);
  return next;
}

export function ItemList({ items, onCrossPrev, onCrossNext }: ItemListProps) {
  const {
    selectionAnchorId, selectionFocusId,
    startSelection, moveFocus, clearSelection, reorderItems, insertItemAfter,
  } = usePlannerStore(useShallow((s) => ({
    selectionAnchorId: s.selectionAnchorId,
    selectionFocusId: s.selectionFocusId,
    startSelection: s.startSelection,
    moveFocus: s.moveFocus,
    clearSelection: s.clearSelection,
    reorderItems: s.reorderItems,
    insertItemAfter: s.insertItemAfter,
  })));

  const ids = items.map((i) => i.id);
  const dayKey = items[0]?.dayKey ?? null;

  // Compute the selected range from anchor↔focus within this container only.
  const anchorIdx = selectionAnchorId ? ids.indexOf(selectionAnchorId) : -1;
  const focusIdx = selectionFocusId ? ids.indexOf(selectionFocusId) : -1;
  const selectedIdsSet = new Set<string>();
  if (focusIdx >= 0) {
    const lo = anchorIdx >= 0 ? Math.min(anchorIdx, focusIdx) : focusIdx;
    const hi = anchorIdx >= 0 ? Math.max(anchorIdx, focusIdx) : focusIdx;
    for (let i = lo; i <= hi; i++) selectedIdsSet.add(ids[i]);
  }

  return (
    <SortableContext items={ids} strategy={verticalListSortingStrategy}>
      <div className="flex flex-col gap-0.5">
        {items.map((item, index) => (
          <DraggableItem
            key={item.id}
            item={item}
            isSelected={selectedIdsSet.has(item.id)}
            isFocused={selectionFocusId === item.id}
            onSelect={() => startSelection(item.id)}
            onExtendSelection={() => {
              if (selectionAnchorId && ids.includes(selectionAnchorId)) {
                moveFocus(item.id);
              } else {
                startSelection(item.id);
              }
            }}
            onDeselect={() => clearSelection()}
            onSelectPrev={(cursorX?: number) => {
              if (index > 0) {
                if (cursorX !== undefined) setPendingEditX(cursorX);
                startSelection(items[index - 1].id);
              } else {
                onCrossPrev?.(cursorX);
              }
            }}
            onSelectNext={(cursorX?: number) => {
              if (index < items.length - 1) {
                if (cursorX !== undefined) setPendingEditX(cursorX);
                startSelection(items[index + 1].id);
              } else {
                onCrossNext?.(cursorX);
              }
            }}
            onShiftSelectPrev={() => {
              if (focusIdx > 0) moveFocus(ids[focusIdx - 1]);
            }}
            onShiftSelectNext={() => {
              if (focusIdx < ids.length - 1) moveFocus(ids[focusIdx + 1]);
            }}
            onMoveUp={() => {
              const next = moveGroupUp(ids, selectedIdsSet);
              if (next) reorderItems(dayKey, next);
            }}
            onMoveDown={() => {
              const next = moveGroupDown(ids, selectedIdsSet);
              if (next) reorderItems(dayKey, next);
            }}
            onInsertAfter={(text: string) => {
              const newId = insertItemAfter(item.id, text);
              // Select the new item and enter edit mode via pending edit position
              setPendingEditX(0);
              startSelection(newId);
            }}
            onDeleteAndFocusPrev={() => {
              // Focus the previous item with cursor at end of text
              if (index > 0) {
                setPendingEditX(99999);
                startSelection(items[index - 1].id);
              } else {
                onCrossPrev?.(99999);
              }
            }}
          />
        ))}
      </div>
    </SortableContext>
  );
}
