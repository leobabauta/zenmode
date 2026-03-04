import { useState, useCallback } from 'react';
import {
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import { useShallow } from 'zustand/react/shallow';
import {
  usePlannerStore,
  selectItemsForDay,
  selectInboxItems,
  selectLaterItems,
} from '../store/usePlannerStore';

function getContainerKey(item: { dayKey: string | null; isLater?: boolean }): string {
  if (item.dayKey !== null) return item.dayKey;
  return item.isLater ? 'later' : 'inbox';
}

export function useDragAndDrop() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const { items, moveItem, reorderItems, sendToInbox, sendToLater } = usePlannerStore(
    useShallow((s) => ({
      items: s.items,
      moveItem: s.moveItem,
      reorderItems: s.reorderItems,
      sendToInbox: s.sendToInbox,
      sendToLater: s.sendToLater,
    }))
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragOver = useCallback((_event: DragOverEvent) => {
    // Visual feedback handled by dnd-kit internally
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeItemId = String(active.id);
    const overId = String(over.id);
    const activeItem = items[activeItemId];
    if (!activeItem) return;

    const sourceContainerKey = getContainerKey(activeItem);

    // Determine target container
    let targetContainerKey: string;
    let targetItemId: string | null = null;

    if (overId === 'inbox' || overId === 'later') {
      targetContainerKey = overId;
    } else if (items[overId]) {
      targetContainerKey = getContainerKey(items[overId]);
      targetItemId = overId;
    } else {
      targetContainerKey = overId; // day key
    }

    // Same container: reorder
    if (sourceContainerKey === targetContainerKey) {
      if (!targetItemId || targetItemId === activeItemId) return;

      const containerItems =
        targetContainerKey === 'inbox'
          ? selectInboxItems(items)
          : targetContainerKey === 'later'
          ? selectLaterItems(items)
          : selectItemsForDay(items, targetContainerKey);

      const oldIndex = containerItems.findIndex((i) => i.id === activeItemId);
      const newIndex = containerItems.findIndex((i) => i.id === targetItemId);

      if (oldIndex === newIndex) return;

      const reordered = arrayMove(containerItems, oldIndex, newIndex);
      reorderItems(
        targetContainerKey === 'inbox' || targetContainerKey === 'later'
          ? null
          : targetContainerKey,
        reordered.map((i) => i.id)
      );
      return;
    }

    // Different container
    if (targetContainerKey === 'inbox') {
      sendToInbox(activeItemId);
    } else if (targetContainerKey === 'later') {
      sendToLater(activeItemId);
    } else {
      // Moving to a day column
      const targetDayKey = targetContainerKey;
      const targetContainer = selectItemsForDay(items, targetDayKey);
      const targetOrder = targetItemId && items[targetItemId]
        ? items[targetItemId].order
        : targetContainer.length;
      moveItem(activeItemId, targetDayKey, targetOrder);
    }
  }, [items, moveItem, reorderItems, sendToInbox, sendToLater]);

  const activeItem = activeId ? items[activeId] : null;

  return {
    activeId,
    activeItem,
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  };
}
