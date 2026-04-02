/**
 * Given anchor/focus selection IDs, returns all item IDs in the selection range.
 * Falls back to just [focusId] when there's no multi-select range.
 */
export function getSelectedItemIds(
  items: Record<string, { id: string; dayKey: string | null; isLater?: boolean; order: number; parentId?: string }>,
  anchorId: string | null,
  focusId: string | null,
): string[] {
  if (!focusId) return [];

  const focusItem = items[focusId];
  if (!focusItem) return [focusId];

  // Build ordered list of items in the same container
  const containerItems = Object.values(items)
    .filter((i) => {
      if (i.parentId) return false;
      if (focusItem.dayKey !== null) return i.dayKey === focusItem.dayKey && Boolean(i.isLater) === Boolean(focusItem.isLater);
      return i.dayKey === null && Boolean(i.isLater) === Boolean(focusItem.isLater);
    })
    .sort((a, b) => a.order - b.order);

  const ids = containerItems.map((i) => i.id);
  const focusIdx = ids.indexOf(focusId);
  const anchorIdx = anchorId ? ids.indexOf(anchorId) : -1;

  if (focusIdx < 0) return [focusId];

  const lo = anchorIdx >= 0 ? Math.min(anchorIdx, focusIdx) : focusIdx;
  const hi = anchorIdx >= 0 ? Math.max(anchorIdx, focusIdx) : focusIdx;
  return ids.slice(lo, hi + 1);
}
