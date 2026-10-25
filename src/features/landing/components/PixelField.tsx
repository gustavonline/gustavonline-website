import { useEffect, useRef, useState } from "react";

import { contributionGrid, type ContributionGrid, type Contributions } from "../githubProfile";
import type { LandingMotion } from "../hooks/useLandingLayout";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useSaveData } from "../hooks/useSaveData";
import type { Theme } from "../types";
import { brandOrder, markSprite, OLIVE, onMarksLoad, palettes, paletteShades, revealBrands, type MarkBrand } from "./brandMarks";
import { clamp, easeOut, fragmentState, isTouchTap, LOOSEN_LIMIT, loosenFragment, nearestZone, revealZone, type TouchPoint, wanderCell } from "./pixelMotion";

/*
 * Contribution field. Each tile is a real GitHub contribution day from the profile
 * projection: columns are weeks (oldest left), rows are weekdays, colour is the
 * day's level 0-4. Without valid data the grid stays neutral; no activity is
 * invented. Canvas2D only, ~30fps, no React state per frame.
 * Motion never changes the data: a soft crest travels through the tiles and a mouse
 * lifts and pushes nearby tiles, which settle behind it. Both may tint an active day
 * up to 35% towards the next level's colour, never a whole level; zero days never tint
 * and sit slightly smaller.
 * Marks are the real assets on their brand panel, drawn as fragments that
 * dissolve into and re-form from the field; fully assembled they are exact.
 *  - reveal (chosen): three concealed zones (Arc'IT, onlinesourdough, Gustav) open
 *    with a local halo under the mouse, a tap or a focused project; Gustav's is olive.
 *  - flow (legacy URL): palettes cycle Gustav → onlinesourdough → Arc'IT with one wandering mark.
 */

const DEFAULT_STEP = 13; // Without data: the established 10px tile + 3px gap.
const MIN_STEP = 9; // Smallest tile pitch before older weeks are left out (narrow screens only).
const TILE_SHARE = 10 / 13;
const FRAME_MS = 1000 / 30;
const POINTER_RADIUS = 76;
const PUSH = 5; // Max pointer displacement of a tile, in px.
const CYCLE_MS = 9000;
const RESUME_MS = 3000;
const WIPE_MS = 1400;
const OPEN_MS = 650;
const CLOSE_MS = 500;
const EXPLORE_MS = 2500;
const FLOW_MARK_CELLS = 3;
const MARK_OUT_MS = 450;
const MARK_IN_MS = 700;
const HALO_LIMIT = [1, 0.6, 0.15];
const LOOSEN_RADIUS = 24;
const LOOSEN_SPEED = 14; // Pointer travel (px per frame) that gives the full stir.
const MAX_FRAGMENTS = 64;
/** Touch targets that keep their own meaning: a tap there never opens a field zone. */
const TAP_IGNORE = "a, button, input, select, textarea, label, summary, [role='tab'], header";

type Slot = { x: number; y: number; size: number };
/** Per-mark pointer loosening: one value per fragment, plus where the stir came from. */
type Wobble = { values: Float32Array; x: number; y: number; peak: number };
type Placement = "top" | "side";
type Range = { from: string; to: string; total: number };

const zoneBrand = (zone: number) => brandOrder.indexOf(revealBrands[zone] as (typeof brandOrder)[number]);
/** Halo and zone tile colours: brand palettes, except Gustav's zone, which turns olive against the orange field. */
const zonePalette = (zone: number) => (revealBrands[zone] === "gustav" ? OLIVE : zoneBrand(zone));
const ZERO_SCALE = 0.82; // Days without contributions sit slightly smaller, so the real date shape reads.

/** Three small zones near the quarter, half and three-quarter points of the field. */
function revealSlots(vertical: boolean, cols: number, rows: number): Slot[] {
  const size = Math.min(cols >= 12 && rows >= 7 ? 4 : 3, cols, rows);
  const place = (centerX: number, centerY: number) => ({
    size,
    x: Math.round(clamp(centerX - size / 2, 0, cols - size)),
    y: Math.round(clamp(centerY - size / 2, 0, rows - size)),
  });
  if (vertical) {
    const usable = rows * 0.84; // Stay above the bottom fade.
    return [0.22, 0.5, 0.78].map((share, index) => place(cols * [0.36, 0.64, 0.42][index], usable * share));
  }
  return [0.25, 0.5, 0.75].map((share, index) => place(cols * share, rows / 2 + [-1, 1, 0][index]));
}

const formatDay = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function PixelField({
  theme,
  placement,
  motion,
  contributions = null,
  highlight = null,
  dimmed = false,
}: {
  theme: Theme;
  placement: Placement;
  motion: LandingMotion;
  contributions?: Contributions | null;
  highlight?: MarkBrand | null;
  dimmed?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<{ retarget: () => void } | null>(null);
  // Survives theme/data re-initialisation so the field never replays from scratch.
  const memoryRef = useRef({
    time: 0,
    brand: 0,
    changedAt: 0,
    nextCycleAt: CYCLE_MS,
    markBrand: 0,
    markProgress: 1,
    markX: Number.NaN,
    markY: Number.NaN,
    pinned: -1,
    zones: [0, 0, 0],
  });
  const [range, setRange] = useState<Range | null>(null);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  // Reduced motion and data saving both get the complete settled frame instead of a running loop.
  const saveData = useSaveData();
  const still = reducedMotion || saveData || dimmed;
  const highlightRef = useRef<MarkBrand | null>(highlight);

  useEffect(() => {
    highlightRef.current = highlight;
    engineRef.current?.retarget();
  }, [highlight]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const memory = memoryRef.current;
    const vertical = placement === "side";
    const shades = paletteShades(palettes[theme]);
    // Hover input comes from each event's actual pointer type (mouse or pen), not the
    // primary-pointer media query, so laptops with touchscreens still get the hover reveal.
    let shownZone = -1;
    let width = 0;
    let height = 0;
    let ratio = 1;
    let step = DEFAULT_STEP;
    let cell = DEFAULT_STEP * TILE_SHARE;
    let gap = step - cell;
    let cols = 0;
    let rows = 0;
    let usableCols = 0;
    let usableRows = 0;
    let originX = 0;
    let originY = 0;
    let slots: Slot[] = [];
    let levels = new Int8Array(0);
    let hasData = false;
    let seeds = new Float32Array(0);
    let energy = new Float32Array(0);
    let tileBrand = new Uint8Array(0);
    let nextBrand = new Uint8Array(0);
    let switchAt = new Float32Array(0);
    let zoneOf = new Int8Array(0);
    let zoneDistance = new Float32Array(0);
    let haloOf = new Int8Array(0);
    let haloRing = new Uint8Array(0);
    let frame = 0;
    let lastFrame = 0;
    let inView = true;
    let pointer: { x: number; y: number; at: number } | null = null;
    let pointerMoved = false;
    let push: { x: number; y: number } | null = null;
    // Pointer motion this frame in canvas coordinates; null when the pointer did not move.
    let stir: { x: number; y: number; speed: number } | null = null;
    let lastStir: { x: number; y: number } | null = null;
    const wobbles: Wobble[] = Array.from({ length: 3 }, () => ({ values: new Float32Array(MAX_FRAGMENTS), x: 0, y: 0, peak: 0 }));

    const fragmentsPerSide = (size: number) => Math.min(Math.sqrt(MAX_FRAGMENTS), Math.max(4, Math.round(size / step) * 2));

    /** Decays a mark's loosening and adds more only from actual pointer motion close to its fragments. */
    const updateWobble = (wobble: Wobble, x: number, y: number, size: number, frames: number) => {
      const perSide = fragmentsPerSide(size);
      const piece = size / perSide;
      const decay = Math.pow(0.86, frames);
      const strength = stir ? clamp(stir.speed / LOOSEN_SPEED) * 0.35 * frames : 0;
      const near =
        stir && strength > 0 && stir.x > x - LOOSEN_RADIUS && stir.x < x + size + LOOSEN_RADIUS && stir.y > y - LOOSEN_RADIUS && stir.y < y + size + LOOSEN_RADIUS;
      if (near && stir) {
        wobble.x = stir.x;
        wobble.y = stir.y;
      }
      let peak = 0;
      for (let row = 0; row < perSide; row += 1) {
        for (let column = 0; column < perSide; column += 1) {
          const index = row * perSide + column;
          let value = wobble.values[index] * decay;
          if (near && stir) {
            const distance = Math.hypot(x + (column + 0.5) * piece - stir.x, y + (row + 0.5) * piece - stir.y);
            if (distance < LOOSEN_RADIUS) value = Math.min(LOOSEN_LIMIT, value + (1 - distance / LOOSEN_RADIUS) ** 2 * strength);
          }
          wobble.values[index] = value < 0.002 ? 0 : value;
          peak = Math.max(peak, wobble.values[index]);
        }
      }
      wobble.peak = peak;
    };

    /** Draws a real mark as fragments of its sprite; exact in one piece once assembled and still. */
    const drawMark = (brand: number, x: number, y: number, size: number, progress: number, seed: number, wobble: Wobble) => {
      if (progress <= 0) return;
      const sprite = markSprite(brand, size, ratio);
      if (!sprite) return;
      if (progress >= 1 && wobble.peak === 0) {
        context.drawImage(sprite, x, y, size, size);
        return;
      }
      const perSide = fragmentsPerSide(size);
      const piece = size / perSide;
      const source = sprite.width / perSide;
      for (let row = 0; row < perSide; row += 1) {
        for (let column = 0; column < perSide; column += 1) {
          const fragment = fragmentState(column, row, perSide, progress, seed);
          if (!fragment.visible) continue;
          const index = row * perSide + column;
          const centerX = x + (column + 0.5) * piece;
          const centerY = y + (row + 0.5) * piece;
          const loose = loosenFragment(wobble.values[index], centerX - wobble.x, centerY - wobble.y, index, seed);
          const drawn = piece * fragment.scale * loose.scale;
          context.globalAlpha = fragment.alpha * loose.alpha;
          context.drawImage(
            sprite,
            column * source,
            row * source,
            source,
            source,
            centerX - drawn / 2 + fragment.dx + loose.dx,
            centerY - drawn / 2 + fragment.dy + loose.dy,
            drawn,
            drawn,
          );
        }
      }
      context.globalAlpha = 1;
    };

    const applyBrand = (brand: number, fromContent: boolean) => {
      if (brand === memory.brand) return;
      memory.brand = brand;
      memory.changedAt = memory.time;
      for (let index = 0; index < tileBrand.length; index += 1) {
        if (memory.time >= switchAt[index]) tileBrand[index] = nextBrand[index];
        const x = index % cols;
        const y = Math.floor(index / cols);
        // Cycles sweep diagonally; a project row sends its colour in from the content side.
        const position = !fromContent
          ? (x / cols) * 0.75 + (y / rows) * 0.25
          : vertical
            ? ((cols - 1 - x) / cols) * 0.8 + (y / rows) * 0.2
            : ((rows - 1 - y) / rows) * 0.8 + (x / cols) * 0.2;
        nextBrand[index] = brand;
        switchAt[index] = still ? memory.time : memory.time + position * WIPE_MS + seeds[index] * 300;
        if (still) tileBrand[index] = brand;
      }
    };

    const localPointer = () => {
      if (!pointer) return null;
      const rect = canvas.getBoundingClientRect();
      const x = pointer.x - rect.left - originX;
      const y = pointer.y - rect.top - originY;
      const inside = x >= 0 && y >= 0 && x <= cols * step && y <= rows * step;
      return inside ? { x, y } : null;
    };

    const zoneCenters = () => slots.map((slot) => ({ x: (slot.x + slot.size / 2) * step, y: (slot.y + slot.size / 2) * step }));
    // Local hit regions: a logo opens only within one slot width of its centre (4 cells: about
    // 45px on a 600px desktop field, about 36px on a 320px phone); touch taps get 1.3× that.
    const slotWidth = () => (slots[0]?.size ?? 0) * step;
    const HOVER_REACH = 1;
    const TAP_REACH = 1.3;

    /**
     * The one open reveal zone. Mouse over the field: only a zone within reach of the pointer
     * (none between zones). Off the field: a project cue, then a touch pin.
     */
    const activeZone = () => {
      const local = localPointer();
      const cued = highlightRef.current;
      return revealZone({
        inField: local !== null,
        hover: local ? nearestZone(local.x, local.y, zoneCenters(), slotWidth() * HOVER_REACH) : -1,
        cue: cued ? revealBrands.indexOf(cued) : -1,
        pinned: memory.pinned,
      });
    };

    /** Flow's mark: near an exploring mouse, otherwise on its slow wander path. */
    const markGoal = (size: number) => {
      const local = !still && pointer && memory.time - pointer.at < EXPLORE_MS ? localPointer() : null;
      if (!local) return wanderCell(memory.time, usableCols, usableRows, size);
      return {
        x: clamp(Math.round(local.x / step - size / 2), 0, Math.max(0, usableCols - size)),
        y: clamp(Math.round(local.y / step - size / 2), 0, Math.max(0, usableRows - size)),
      };
    };

    const updateFlowMark = (frames: number) => {
      const size = Math.min(FLOW_MARK_CELLS, cols, rows);
      if (frames === 0) {
        memory.markBrand = memory.brand;
        memory.markProgress = 1;
        if (Number.isNaN(memory.markX)) {
          memory.markX = Math.floor((usableCols - size) / 2);
          memory.markY = Math.floor((usableRows - size) / 2);
        }
      } else {
        const goal = markGoal(size);
        const follow = Math.min(1, 0.06 * frames);
        memory.markX += (goal.x - memory.markX) * follow;
        memory.markY += (goal.y - memory.markY) * follow;
        const elapsed = frames * 16.7;
        if (memory.markBrand !== memory.brand) {
          // Melt the old mark into the field, then re-form as the new brand.
          memory.markProgress -= elapsed / MARK_OUT_MS;
          if (memory.markProgress <= 0) {
            memory.markProgress = 0;
            memory.markBrand = memory.brand;
          }
        } else {
          // A recurring breath: part of the mark briefly loosens mid-cycle, then settles.
          const sinceChange = (memory.time - memory.changedAt) % CYCLE_MS;
          const target = sinceChange > 4200 && sinceChange < 5400 ? 0.72 : 1;
          const change = elapsed / MARK_IN_MS;
          memory.markProgress = target > memory.markProgress ? Math.min(target, memory.markProgress + change) : Math.max(target, memory.markProgress - change);
        }
      }
      memory.markX = clamp(memory.markX, 0, Math.max(0, cols - size));
      memory.markY = clamp(memory.markY, 0, Math.max(0, rows - size));
      return size;
    };

    /** Advances state by `frames` (0 snaps to the settled state) and draws. */
    const render = (frames: number) => {
      const time = memory.time;
      stir = null;
      if (frames > 0) {
        const decay = Math.pow(0.9, frames);
        for (let index = 0; index < energy.length; index += 1) energy[index] *= decay;
        if (pointerMoved) {
          const local = localPointer();
          if (local) {
            addPointerEnergy(local, frames);
            const at = { x: local.x + originX, y: local.y + originY };
            stir = { ...at, speed: lastStir ? Math.hypot(at.x - lastStir.x, at.y - lastStir.y) : 0 };
            lastStir = at;
          } else {
            lastStir = null;
          }
        }
        pointerMoved = false;
      }

      if (motion === "reveal") {
        const active = activeZone();
        shownZone = active;
        memory.zones = memory.zones.map((amount, zone) => {
          const goal = zone === active ? 1 : 0;
          if (frames === 0) return goal;
          return goal > amount ? Math.min(1, amount + (frames * 16.7) / OPEN_MS) : Math.max(0, amount - (frames * 16.7) / CLOSE_MS);
        });
      }

      context.clearRect(0, 0, width, height);
      for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < cols; x += 1) {
          const index = y * cols + x;
          const dataLevel = levels[index];
          if (dataLevel < 0) continue; // No contribution day here: leave the cell empty.
          if (time >= switchAt[index]) tileBrand[index] = nextBrand[index];
          // Ambient physical motion only: a soft crest travelling through the field plus a tiny bob.
          // Three bounded layers: a travelling crest, a slow cross ripple and a per-tile bob.
          const crest = Math.max(0, Math.sin(time * 0.0012 - x * 0.33 - y * 0.21)) ** 3;
          const ripple = Math.sin(time * 0.0009 - x * 0.19 + y * 0.42);
          const bob = Math.sin(time * 0.0021 + seeds[index] * 40) * 0.55 + ripple * 0.45;
          const lift = crest * 0.95 + energy[index] * 1.2;
          let brand = motion === "flow" ? tileBrand[index] : 0;
          let scale = dataLevel === 0 && hasData ? ZERO_SCALE : 1;
          let minLevel = 0;
          if (motion === "reveal") {
            const halo = haloOf[index];
            if (halo >= 0) {
              const ring = haloRing[index];
              const amount = memory.zones[halo];
              // A local, readable halo: the closest ring fully, sparser further out, staggered outwards.
              if (amount > 0 && seeds[index] < HALO_LIMIT[ring - 1] && amount * 1.25 > ring * 0.3 + seeds[index] * 0.2) {
                brand = zonePalette(halo);
                minLevel = 3 - ring;
              }
            }
            const zone = zoneOf[index];
            if (zone >= 0 && memory.zones[zone] > 0) {
              brand = zonePalette(zone);
              minLevel = 2;
              // The zone's own tiles melt away as the mark's fragments arrive over them.
              scale *= 1 - easeOut(clamp(memory.zones[zone] * 1.3 - zoneDistance[index] * 0.3));
              if (scale < 0.05) continue;
            }
          }
          let pushX = 0;
          let pushY = 0;
          if (push && energy[index] > 0.02) {
            const offsetX = x * step + cell / 2 - push.x;
            const offsetY = y * step + cell / 2 - push.y;
            const distance = Math.hypot(offsetX, offsetY) || 1;
            pushX = (offsetX / distance) * energy[index] * PUSH;
            pushY = (offsetY / distance) * energy[index] * PUSH;
          }
          // Colour is the real contribution level. The passing crest and a mouse only tint it
          // part of the way towards the next level's colour; days without activity never tint.
          const level = Math.min(4, Math.max(minLevel, dataLevel));
          const tones = shades[brand][level];
          const tone = tones[Math.round(clamp(crest * 0.8 + energy[index]) * (tones.length - 1))];
          const size = cell * scale + lift * 2;
          const inset = (cell - size) / 2;
          context.fillStyle = tone;
          context.beginPath();
          context.roundRect(originX + x * step + inset + pushX, originY + y * step + inset - lift * 2 + bob + pushY, size, size, Math.min(2, size / 4));
          context.fill();
        }
      }

      // Marks also loosen under nearby pointer motion and reassemble as it decays.
      if (motion === "reveal") {
        slots.forEach((slot, zone) => {
          const x = originX + slot.x * step;
          const y = originY + slot.y * step;
          const size = slot.size * step - gap;
          if (frames > 0) updateWobble(wobbles[zone], x, y, size, frames);
          drawMark(zoneBrand(zone), x, y, size, memory.zones[zone], zone * 13 + 1, wobbles[zone]);
        });
      }
      if (motion === "flow") {
        const cells = updateFlowMark(frames);
        const x = originX + memory.markX * step;
        const y = originY + memory.markY * step;
        const size = cells * step - gap;
        if (frames > 0) updateWobble(wobbles[0], x, y, size, frames);
        drawMark(memory.markBrand, x, y, size, memory.markProgress, memory.markBrand * 13 + 1, wobbles[0]);
      }
    };

    const addPointerEnergy = (local: { x: number; y: number }, frames: number) => {
      push = local;
      const minX = Math.max(0, Math.floor((local.x - POINTER_RADIUS) / step));
      const maxX = Math.min(cols - 1, Math.ceil((local.x + POINTER_RADIUS) / step));
      const minY = Math.max(0, Math.floor((local.y - POINTER_RADIUS) / step));
      const maxY = Math.min(rows - 1, Math.ceil((local.y + POINTER_RADIUS) / step));
      for (let y = minY; y <= maxY; y += 1) {
        for (let x = minX; x <= maxX; x += 1) {
          const distance = Math.hypot(x * step + cell / 2 - local.x, y * step + cell / 2 - local.y);
          if (distance >= POINTER_RADIUS) continue;
          const index = y * cols + x;
          const falloff = 1 - distance / POINTER_RADIUS;
          energy[index] = Math.min(0.85, energy[index] + falloff * falloff * 0.18 * frames);
        }
      }
    };

    /** Lays out the grid: real weeks × weekdays when data exists, otherwise a neutral grid. */
    const layoutGrid = (): ContributionGrid | null => {
      const along = vertical ? height : width;
      const across = vertical ? width : height;
      const grid = contributions ? contributionGrid(contributions, Math.floor(along / MIN_STEP)) : null;
      if (grid) {
        step = Math.min(DEFAULT_STEP, along / grid.columns, across / 7);
        cols = vertical ? 7 : grid.columns;
        rows = vertical ? grid.columns : 7;
      } else {
        step = DEFAULT_STEP;
        cols = Math.max(0, Math.floor((width + DEFAULT_STEP * (1 - TILE_SHARE)) / step));
        rows = Math.max(0, Math.floor((height + DEFAULT_STEP * (1 - TILE_SHARE)) / step));
      }
      cell = step * TILE_SHARE;
      gap = step - cell;
      hasData = grid !== null;
      levels = new Int8Array(cols * rows).fill(grid ? -1 : 0);
      if (grid) {
        for (let week = 0; week < grid.columns; week += 1) {
          for (let weekday = 0; weekday < 7; weekday += 1) {
            const index = vertical ? week * cols + weekday : weekday * cols + week;
            levels[index] = grid.levels[week * 7 + weekday];
          }
        }
      }
      return grid;
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const grid = layoutGrid();
      setRange((current) =>
        !grid ? null : current?.from === grid.from && current.to === grid.to && current.total === grid.total ? current : { from: grid.from, to: grid.to, total: grid.total },
      );
      // Keep marks out of the CSS edge fades.
      usableCols = vertical ? Math.floor(cols * 0.88) : Math.floor(cols * 0.8);
      usableRows = vertical ? Math.floor(rows * 0.84) : rows;
      originX = vertical ? (width - (cols * step - gap)) / 2 : 0;
      originY = (height - (rows * step - gap)) / 2;
      const count = cols * rows;
      seeds = createSeeds(count);
      energy = new Float32Array(count);
      tileBrand = new Uint8Array(count).fill(memory.brand);
      nextBrand = new Uint8Array(count).fill(memory.brand);
      switchAt = new Float32Array(count);
      zoneOf = new Int8Array(count).fill(-1);
      zoneDistance = new Float32Array(count);
      haloOf = new Int8Array(count).fill(-1);
      haloRing = new Uint8Array(count);
      slots = motion === "reveal" && cols && rows ? revealSlots(vertical, cols, rows) : [];
      slots.forEach((slot, zone) => {
        const center = (slot.size - 1) / 2;
        for (let y = Math.max(0, slot.y - 3); y < Math.min(rows, slot.y + slot.size + 3); y += 1) {
          for (let x = Math.max(0, slot.x - 3); x < Math.min(cols, slot.x + slot.size + 3); x += 1) {
            const index = y * cols + x;
            const outsideX = Math.max(slot.x - x, 0, x - (slot.x + slot.size - 1));
            const outsideY = Math.max(slot.y - y, 0, y - (slot.y + slot.size - 1));
            const ring = Math.ceil(Math.hypot(outsideX, outsideY));
            if (ring === 0) {
              zoneOf[index] = zone;
              zoneDistance[index] = Math.hypot(x - slot.x - center, y - slot.y - center) / Math.max(1, center * Math.SQRT2);
            } else if (ring <= 3 && zoneOf[index] < 0 && (haloOf[index] < 0 || ring < haloRing[index])) {
              haloOf[index] = zone;
              haloRing[index] = ring;
            }
          }
        }
      });
      if (cols && rows) render(0);
    };

    const tick = (now: number) => {
      frame = window.requestAnimationFrame(tick);
      const elapsed = now - lastFrame;
      if (elapsed < FRAME_MS) return;
      lastFrame = now;
      const delta = Math.min(elapsed, 100);
      memory.time += delta;
      if (motion === "flow" && !highlightRef.current && memory.time >= memory.nextCycleAt) {
        applyBrand((memory.brand + 1) % brandOrder.length, false);
        memory.nextCycleAt = memory.time + CYCLE_MS;
      }
      if (cols && rows) render(delta / 16.7);
    };

    const start = () => {
      if (still || frame || !inView || document.hidden) return;
      lastFrame = performance.now();
      frame = window.requestAnimationFrame(tick);
    };

    const stop = () => {
      window.cancelAnimationFrame(frame);
      frame = 0;
    };

    engineRef.current = {
      retarget: () => {
        const cued = highlightRef.current;
        if (motion === "flow") {
          if (cued) applyBrand(brandOrder.indexOf(cued), true);
          // After a cue the automatic cycle resumes shortly.
          memory.nextCycleAt = memory.time + (cued ? CYCLE_MS : RESUME_MS);
        }
        if (still && cols && rows) render(0);
      },
    };

    const onVisibility = () => (document.hidden ? stop() : start());
    /** With reduced motion, redraw the settled frame only when the open zone actually changes. */
    const settleIfChanged = () => {
      if (still && motion === "reveal" && cols && rows && activeZone() !== shownZone) render(0);
    };
    // The finger currently down, if this press could still become a tap.
    let touchStart: TouchPoint | null = null;
    const touchPoint = (event: PointerEvent): TouchPoint => ({ id: event.pointerId, x: event.clientX, y: event.clientY, at: event.timeStamp });
    const onPointerDown = (event: PointerEvent) => {
      touchStart = event.pointerType === "touch" && event.isPrimary ? touchPoint(event) : null;
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      pointer = { x: event.clientX, y: event.clientY, at: memory.time };
      pointerMoved = true;
      memory.pinned = -1; // A mouse never latches a zone; hover decides.
      settleIfChanged();
    };
    const clearPointer = () => {
      pointer = null;
      lastStir = null;
      settleIfChanged();
    };
    const onPointerOut = (event: PointerEvent) => {
      if (!event.relatedTarget) clearPointer();
    };
    // Touch only: a tap near a zone opens it; tapping it again or elsewhere closes it. The field keeps
    // pointer-events:none, so this listens passively on window and never blocks scrolling or links.
    // A tap is a short, still press and release of one finger (not a click event, which mobile Safari
    // does not deliver for non-interactive content). The browser cancels a press that becomes a scroll.
    const onTouchCancel = () => {
      touchStart = null;
    };
    const onTouchEnd = (event: PointerEvent) => {
      const start = touchStart;
      touchStart = null;
      if (event.pointerType !== "touch" || !isTouchTap(start, touchPoint(event))) return;
      // Controls and anything layered over the field (such as the open site menu) only close a pin.
      const target = event.target instanceof Element ? event.target : null;
      const overControl = target?.closest(TAP_IGNORE) != null;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left - originX;
      const y = event.clientY - rect.top - originY;
      const inside = !overControl && x >= 0 && y >= 0 && x <= cols * step && y <= rows * step;
      const nearest = inside ? nearestZone(x, y, zoneCenters(), slotWidth() * TAP_REACH) : -1;
      if (nearest === -1 && memory.pinned === -1) return;
      memory.pinned = nearest === memory.pinned ? -1 : nearest;
      if (still) render(0);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView) start();
      else stop();
    });
    intersectionObserver.observe(canvas);
    const stopWaitingForMarks = onMarksLoad(() => cols && rows && render(0));
    document.addEventListener("visibilitychange", onVisibility);
    if (!dimmed) {
      window.addEventListener("pointerdown", onPointerDown, { passive: true });
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("pointerout", onPointerOut);
      window.addEventListener("blur", clearPointer);
    }
    if (motion === "reveal" && !dimmed) {
      window.addEventListener("pointerup", onTouchEnd, { passive: true });
      window.addEventListener("pointercancel", onTouchCancel, { passive: true });
    }

    resize();
    start();

    return () => {
      stop();
      engineRef.current = null;
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      stopWaitingForMarks();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerout", onPointerOut);
      window.removeEventListener("blur", clearPointer);
      window.removeEventListener("pointerup", onTouchEnd);
      window.removeEventListener("pointercancel", onTouchCancel);
    };
  }, [theme, still, motion, placement, dimmed, contributions]);

  return (
    <div
      className={`pixel-field pixel-field-${placement} pixel-field-motion-${motion}${dimmed ? " is-dimmed" : ""}`}
      data-range={range ? `${range.from}/${range.to}` : undefined}
    >
      {/* Stays in layout (only fading) while dimmed, so the page never moves. */}
      <div className="pixel-field-surface" aria-hidden="true">
        <canvas ref={canvasRef} />
      </div>
      {range && (
        <p className="sr-only">
          GitHub contributions from {formatDay(range.from)} to {formatDay(range.to)}: {range.total.toLocaleString("en-GB")}.
        </p>
      )}
    </div>
  );
}

// Fixed seed for motion only (bob phase, halo spread, wipe jitter); never for activity levels.
function createSeeds(count: number) {
  const seeds = new Float32Array(count);
  let state = 0x9e3779b9;
  for (let index = 0; index < count; index += 1) {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    const random = ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
    seeds[index] = random * random;
  }
  return seeds;
}
