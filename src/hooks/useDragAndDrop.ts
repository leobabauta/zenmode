import { useState, useCallback, useEffect, useRef } from 'react';
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
import { getSelectedItemIds } from '../lib/selection';
import { toDayKey } from '../lib/dates';

function getContainerKey(item: { dayKey: string | null; isLater?: boolean }): string {
  if (item.dayKey !== null) return item.dayKey;
  return item.isLater ? 'later' : 'inbox';
}

export function useDragAndDrop() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const altKeyRef = useRef(false);

  // Track Alt key state for subtask drop detection
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { altKeyRef.current = e.altKey; };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); };
  }, []);
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

      // Resolve all selected items (or just the dragged one)
      const state = usePlannerStore.getState();
      const selectedIds = getSelectedItemIds(state.items, state.selectionAnchorId, state.selectionFocusId);
      const dragIds = selectedIds.includes(activeIdStr) ? selectedIds : [activeIdStr];

      if (overId === 'sidebar-inbox') {
        for (const id of dragIds) sendToInbox(id);
        state.clearSelection();
        return;
      }
      if (overId === 'sidebar-today') {
        const todayKey = toDayKey(new Date());
        const todayItems = selectItemsForDay(state.items, todayKey);
        const maxOrder = todayItems.length > 0
          ? Math.max(...todayItems.map((i) => i.order))
          : -1;
        for (let i = 0; i < dragIds.length; i++) {
          moveItem(dragIds[i], todayKey, maxOrder + 1 + i);
        }
        state.clearSelection();
        return;
      }
      if (overId === 'sidebar-later') {
        for (const id of dragIds) sendToLater(id);
        state.clearSelection();
        return;
      }
      if (overId === 'sidebar-archive') {
        usePlannerStore.setState((s) => {
          for (const id of dragIds) {
            const item = s.items[id];
            if (item) {
              item.isArchived = true;
              item.updatedAt = new Date().toISOString();
            }
          }
        });
        state.clearSelection();
        return;
      }
      if (overId.startsWith('sidebar-list-')) {
        const listId = overId.slice('sidebar-list-'.length);
        for (const id of dragIds) sendToList(id, listId);
        state.clearSelection();
        return;
      }
      if (overId.startsWith('sidebar-label-')) {
        const tag = overId.slice('sidebar-label-'.length);
        for (const id of dragIds) {
          const it = items[id];
          if (it && !it.text.toLowerCase().includes(tag.toLowerCase())) {
            updateItem(id, { text: `${it.text} ${tag}` });
          }
        }
        state.clearSelection();
        return;
      }
      return;
    }

    // --- Alt/Option+drop onto a task to make subtask ---
    const altHeld = altKeyRef.current;
    const activeItem = items[activeIdStr];
    if (!activeItem) return;

    if (altHeld && items[overId] && overId !== activeIdStr && activeItem.parentId !== overId) {
      // Don't allow circular: parent becoming child of its own child
      if (!(items[overId]?.parentId === activeIdStr)) {
        usePlannerStore.setState((state) => {
          const item = state.items[activeIdStr];
          const parent = state.items[overId];
          if (!item || !parent) return;
          const childCount = Object.values(state.items).filter((i) => i.parentId === overId).length;
          item.parentId = overId;
          item.dayKey = parent.dayKey;
          item.isLater = parent.isLater;
          item.listId = parent.listId;
          item.order = childCount;
          item.updatedAt = new Date().toISOString();
        });
        return;
      }
    }

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

      const state = usePlannerStore.getState();
      const selectedIds = getSelectedItemIds(state.items, state.selectionAnchorId, state.selectionFocusId);
      const dragIds = selectedIds.includes(activeIdStr) ? selectedIds : [activeIdStr];

      const containerItems =
        targetContainerKey === 'inbox'
          ? selectInboxItems(items)
          : targetContainerKey === 'later'
          ? selectLaterItems(items)
          : selectItemsForDay(items, targetContainerKey);

      // If dragging multiple items, move them as a group
      if (dragIds.length > 1) {
        const dragIdsSet = new Set(dragIds);
        const nonDraggedItems = containerItems.filter((i) => !dragIdsSet.has(i.id));
        const targetIndex = nonDraggedItems.findIndex((i) => i.id === targetItemId);
        
        if (targetIndex === -1) return;
        
        // Insert the dragged items at the target position
        const reordered = [
          ...nonDraggedItems.slice(0, targetIndex),
          ...dragIds.map((id) => items[id]).filter(Boolean),
          ...nonDraggedItems.slice(targetIndex)
        ];
        
        reorderItems(
          targetContainerKey === 'inbox' || targetContainerKey === 'later'
            ? null
            : targetContainerKey,
          reordered.map((i) => i.id)
        );
      } else {
        // Single item drag: use existing logic
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
      }
      state.clearSelection();
      return;
    }

    // Different container — move all selected items if dragged item is in the selection
    const state = usePlannerStore.getState();
    const selectedIds = getSelectedItemIds(state.items, state.selectionAnchorId, state.selectionFocusId);
    const dragIds = selectedIds.includes(activeIdStr) ? selectedIds : [activeIdStr];

    if (targetContainerKey === 'inbox') {
      for (const id of dragIds) sendToInbox(id);
    } else if (targetContainerKey === 'later') {
      for (const id of dragIds) sendToLater(id);
    } else {
      // Moving to a day column
      const targetDayKey = targetContainerKey;
      const targetContainer = selectItemsForDay(items, targetDayKey);
      const baseOrder = targetItemId && items[targetItemId]
        ? items[targetItemId].order
        : targetContainer.length;
      for (let i = 0; i < dragIds.length; i++) {
        moveItem(dragIds[i], targetDayKey, baseOrder + i);
      }
    }
    state.clearSelection();
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
