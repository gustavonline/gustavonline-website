/* Pure motion helpers for the decorative tile field (no DOM), kept separate so they can be tested. */

export const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));
export const easeOut = (value: number) => 1 - (1 - value) ** 3;
export const hash = (value: number) => {
  const raw = Math.sin(value * 12.9898 + 78.233) * 43758.5453;
  return raw - Math.floor(raw);
};

/**
 * One fragment of a dissolving mark. `progress` 0 = fully melted into the field,
 * 1 = assembled. Centre fragments arrive first; every fragment is settled by 1,
 * so the real mark is always exact and readable at rest.
 */
export function fragmentState(column: number, row: number, perSide: number, progress: number, seed: number) {
  const index = row * perSide + column;
  const offsetX = (column + 0.5) / perSide - 0.5;
  const offsetY = (row + 0.5) / perSide - 0.5;
  const distance = Math.min(1, Math.hypot(offsetX, offsetY) / Math.SQRT1_2);
  const delay = distance * 0.35 + hash(index + seed) * 0.25;
  const local = clamp((progress - delay) / 0.4);
  const settled = easeOut(local);
  const angle = hash(index * 1.7 + seed) * Math.PI * 2;
  const spread = (1 - settled) * (5 + distance * 7);
  return {
    visible: local > 0,
    alpha: clamp(local * 1.6),
    scale: 0.35 + 0.65 * settled,
    dx: Math.cos(angle) * spread + offsetX * (1 - settled) * 12,
    dy: Math.sin(angle) * spread + offsetY * (1 - settled) * 12 - (1 - settled) * 3,
  };
}

/**
 * Index of the zone whose centre is nearest to (x, y) and no further than `radius`,
 * or -1. Logos stay hidden until the pointer is near their own position.
 */
export function nearestZone(x: number, y: number, centers: readonly { x: number; y: number }[], radius = Infinity) {
  let nearest = -1;
  let best = radius;
  centers.forEach((center, index) => {
    const distance = Math.hypot(x - center.x, y - center.y);
    if (distance <= best) [best, nearest] = [distance, index];
  });
  return nearest;
}

/**
 * Which reveal zone is open (-1 for none). While a mouse is over the field, its local
 * hit (`hover`, possibly -1 between zones) decides alone, so stale cues never show a
 * logo away from the pointer. Off the field: a project cue (mouse over a project, or
 * keyboard focus), then a touch tap's pin, which only exists on touch input.
 */
export function revealZone({ inField, hover, cue, pinned }: { inField: boolean; hover: number; cue: number; pinned: number }) {
  if (inField) return hover;
  if (cue >= 0) return cue;
  return pinned;
}

export type TouchPoint = { id: number; x: number; y: number; at: number };

/** Finger travel (px) and press length (ms) that still count as a tap rather than a scroll or long press. */
export const TAP_SLOP = 10;
export const TAP_MAX_MS = 500;

/**
 * Whether a touch press and its release form a tap. The page keeps native scrolling:
 * a scroll gesture is cancelled by the browser (no release) or travels beyond the slop,
 * so it never opens or closes a zone. Only the same finger that went down counts.
 */
export function isTouchTap(start: TouchPoint | null, end: TouchPoint) {
  if (!start || start.id !== end.id) return false;
  const duration = end.at - start.at;
  return duration >= 0 && duration <= TAP_MAX_MS && Math.hypot(end.x - start.x, end.y - start.y) <= TAP_SLOP;
}

/** Upper bound for a fragment's pointer loosening, so the mark always stays recognisable. */
export const LOOSEN_LIMIT = 0.75;

/**
 * Extra displacement for a fragment loosened by nearby pointer motion: pushed away
 * from the pointer with a little seeded jitter, slightly smaller and fainter.
 * `amount` 0 leaves the fragment exactly in place.
 */
export function loosenFragment(amount: number, awayX: number, awayY: number, index: number, seed: number) {
  const loosened = clamp(amount, 0, LOOSEN_LIMIT);
  const distance = Math.hypot(awayX, awayY) || 1;
  const angle = hash(index * 2.3 + seed) * Math.PI * 2;
  return {
    dx: (awayX / distance) * loosened * 7 + Math.cos(angle) * loosened * 2.5,
    dy: (awayY / distance) * loosened * 7 + Math.sin(angle) * loosened * 2.5 - loosened * 2,
    scale: 1 - loosened * 0.4,
    alpha: 1 - loosened * 0.3,
  };
}

/**
 * Flow's slow autonomous path (top-left cell of the mark), so the mark keeps
 * moving with a stationary or absent pointer. Always inside the usable area.
 */
export function wanderCell(time: number, usableCols: number, usableRows: number, size: number) {
  const spanX = Math.max(0, usableCols - size);
  const spanY = Math.max(0, usableRows - size);
  const x = spanX / 2 + (spanX / 2) * 0.8 * Math.sin(time * 0.00009);
  const y = spanY / 2 + (spanY / 2) * 0.8 * Math.sin(time * 0.00013 + 1);
  return { x: Math.round(clamp(x, 0, spanX)), y: Math.round(clamp(y, 0, spanY)) };
}
