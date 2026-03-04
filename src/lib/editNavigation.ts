/**
 * Module-level mutable variable — set synchronously before the React state
 * update that triggers the destination item's render, consumed in its effect.
 */
let _pendingEditX: number | null = null;

export function setPendingEditX(x: number): void { _pendingEditX = x; }
export function consumePendingEditX(): number | null {
  const x = _pendingEditX;
  _pendingEditX = null;
  return x;
}

/** Screen x-coordinate of the cursor inside an <input>. */
export function getInputCursorX(input: HTMLInputElement): number {
  const style = window.getComputedStyle(input);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return input.getBoundingClientRect().left;
  ctx.font = `${style.fontSize} ${style.fontFamily}`;
  const text = input.value.substring(0, input.selectionStart ?? 0);
  const rect = input.getBoundingClientRect();
  const paddingLeft = parseFloat(style.paddingLeft) || 0;
  return rect.left + paddingLeft + ctx.measureText(text).width - (input.scrollLeft || 0);
}

/** Character offset in an <input> whose position is closest to targetX. */
export function getOffsetFromX(input: HTMLInputElement, targetX: number): number {
  const style = window.getComputedStyle(input);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return input.value.length;
  ctx.font = `${style.fontSize} ${style.fontFamily}`;
  const rect = input.getBoundingClientRect();
  const paddingLeft = parseFloat(style.paddingLeft) || 0;
  const relativeX = targetX - rect.left - paddingLeft + (input.scrollLeft || 0);
  const text = input.value;
  let bestOffset = text.length;
  let bestDist = Infinity;
  for (let i = 0; i <= text.length; i++) {
    const dist = Math.abs(ctx.measureText(text.substring(0, i)).width - relativeX);
    if (dist < bestDist) { bestDist = dist; bestOffset = i; }
  }
  return bestOffset;
}
