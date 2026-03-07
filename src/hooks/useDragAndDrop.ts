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
  const { items, moveItem, reorderItems, sendToInbox, sendToLater, sendToList, updateItem, reorderNav, reorderLabels } = usePlannerStore(
    useShallow((s) => ({
      items: s.items,
      moveItem: s.moveItem,
      reorderItems: s.reorderItems,
      sendToInbox: s.sendToInbox,
      sendToLater: s.sendToLater,
      sendToList: s.sendToList,
      updateItem: s.updateItem,
      reorderNav: s.reorderNav,
      reorderLabels: s.reorderLabels,
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

    const activeIdStr = String(active.id);
    const overId = String(over.id);

    // --- Sidebar nav reorder ---
    if (activeIdStr.startsWith('nav-') && overId.startsWith('nav-')) {
      if (activeIdStr === overId) return;
      const state = usePlannerStore.getState();
      const navOrder = state.navOrder && state.navOrder.length > 0
        ? state.navOrder
        : ['timeline', 'inbox', 'today', 'later', 'archive'];
      const activeNav = activeIdStr.slice(4);
      const overNav = overId.slice(4);
      const oldIndex = navOrder.indexOf(activeNav);
      const newIndex = navOrder.indexOf(overNav);
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderNav(arrayMove([...navOrder], oldIndex, newIndex));
      }
      return;
    }

    // --- Sidebar label reorder ---
    if (activeIdStr.startsWith('label-') && overId.startsWith('label-')) {
      if (activeIdStr === overId) return;
      const state = usePlannerStore.getState();
      const activeTag = activeIdStr.slice(6);
      const overTag = overId.slice(6);
      // Get current label order from store
      const allHashtags = new Set<string>();
      Object.values(state.items).forEach((item) => {
        const matches = item.text.match(/(#[\w-]+)/g);
        if (matches) matches.forEach((m) => allHashtags.add(m.toLowerCase()));
      });
      const tags = Array.from(allHashtags).sort();
      const ordered = state.labelOrder && state.labelOrder.length > 0
        ? state.labelOrder.filter((t) => tags.includes(t)).concat(tags.filter((t) => !state.labelOrder.includes(t)))
        : tags;
      const oldIndex = ordered.indexOf(activeTag);
      const newIndex = ordered.indexOf(overTag);
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderLabels(arrayMove([...ordered], oldIndex, newIndex));
      }
      return;
    }

    // --- Task drop onto sidebar target ---
    if (overId.startsWith('sidebar-')) {
      const activeItem = items[activeIdStr];
      if (!activeItem) return; // only handle task/item drops

      if (overId === 'sidebar-inbox') {
        sendToInbox(activeIdStr);
        return;
      }
      if (overId === 'sidebar-later') {
        sendToLater(activeIdStr);
        return;
      }
      if (overId.startsWith('sidebar-list-')) {
        const listId = overId.slice('sidebar-list-'.length);
        sendToList(activeIdStr, listId);
        return;
      }
      if (overId.startsWith('sidebar-label-')) {
        const tag = overId.slice('sidebar-label-'.length);
        // Add the label to the item's text if not already present
        if (!activeItem.text.toLowerCase().includes(tag.toLowerCase())) {
          updateItem(activeIdStr, { text: `${activeItem.text} ${tag}` });
        }
        return;
      }
      return;
    }

    // --- Drop task onto another task to make subtask ---
    if (overId.startsWith('subtask-')) {
      const parentId = overId.slice('subtask-'.length);
      const activeItem = items[activeIdStr];
      if (!activeItem || parentId === activeIdStr || activeItem.parentId === parentId) return;
      // Don't allow making a parent into a child of its own child
      if (items[parentId]?.parentId === activeIdStr) return;
      usePlannerStore.setState((state) => {
        const item = state.items[activeIdStr];
        const parent = state.items[parentId];
        if (!item || !parent) return;
        // Count existing children to set order
        const childCount = Object.values(state.items).filter((i) => i.parentId === parentId).length;
        item.parentId = parentId;
        item.dayKey = parent.dayKey;
        item.isLater = parent.isLater;
        item.listId = parent.listId;
        item.order = childCount;
        item.updatedAt = new Date().toISOString();
      });
      return;
    }

    // --- Normal task reorder/move ---
    const activeItem = items[activeIdStr];
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
      if (!targetItemId || targetItemId === activeIdStr) return;

      const containerItems =
        targetContainerKey === 'inbox'
          ? selectInboxItems(items)
          : targetContainerKey === 'later'
          ? selectLaterItems(items)
          : selectItemsForDay(items, targetContainerKey);

      const oldIndex = containerItems.findIndex((i) => i.id === activeIdStr);
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
      sendToInbox(activeIdStr);
    } else if (targetContainerKey === 'later') {
      sendToLater(activeIdStr);
    } else {
      // Moving to a day column
      const targetDayKey = targetContainerKey;
      const targetContainer = selectItemsForDay(items, targetDayKey);
      const targetOrder = targetItemId && items[targetItemId]
        ? items[targetItemId].order
        : targetContainer.length;
      moveItem(activeIdStr, targetDayKey, targetOrder);
    }
  }, [items, moveItem, reorderItems, sendToInbox, sendToLater, sendToList, updateItem, reorderNav, reorderLabels]);

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
