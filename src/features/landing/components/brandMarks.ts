import type { Theme } from "../types";

/*
 * Brand family used by the tile field: Gustav Online, onlinesourdough and Arc'IT AI.
 * Organisation marks are the approved SVGs in public/assets/brand-marks with their
 * LinkedIn banner R11 panels; Gustav uses the pixel G. (Kastanje was removed from
 * the website; its asset file is kept only as archive.)
 */

export type MarkBrand = "gustav" | "onlinesourdough" | "arcitai";
type OrgBrand = Exclude<MarkBrand, "gustav">;

/** Palette and sprite index: 0 is Gustav Online's own orange, then the banner order. */
export const brandOrder = ["gustav", "onlinesourdough", "arcitai"] as const satisfies readonly MarkBrand[];
export const markBrands: readonly MarkBrand[] = brandOrder;
/** Reveal zones left to right, matching the Selected work owner order (Arc'IT, onlinesourdough, Gustav). */
export const revealBrands: readonly MarkBrand[] = ["arcitai", "onlinesourdough", "gustav"];
/** The hero brand for each project owner in the profile projection. */
export const ownerBrands = { arcitai: "arcitai", onlinesourdough: "onlinesourdough", gustavonline: "gustav" } as const;

type MarkSpec = {
  src: string;
  panel: string;
  /** SVG viewBox size, used to fit the mark inside its slot. */
  view: [number, number];
};

export const marks: Record<OrgBrand, MarkSpec> = {
  onlinesourdough: { src: "/assets/brand-marks/onlinesourdough.svg", panel: "#e8d9c3", view: [10, 7] },
  arcitai: { src: "/assets/brand-marks/arcitai.svg", panel: "#4265a0", view: [60, 60] },
};

export const gustavPanel = "#f4f1ea";
const gustavMarkSrc = "/assets/gustav-pixel-g-384.png";

/** Palette row for Gustav's reveal halo: olive, so the G zone separates from the orange field. */
export const OLIVE = 3;

// Five levels per brand (GitHub's contribution levels 0-4): a shared warm neutral, then steps towards each brand's ink.
// Rows follow brandOrder; row 3 (OLIVE) is only used around an open Gustav zone, never for the whole field.
export const palettes: Record<Theme, string[][]> = {
  light: [
    ["#ece6dc", "#f8d3b2", "#f5aa70", "#ee7f3c", "#d4621f"],
    ["#ece6dc", "#efe4d3", "#e3cfb0", "#a98a6b", "#2b1b12"],
    ["#ece6dc", "#dce2ed", "#adbcd8", "#7891c1", "#4265a0"],
    ["#ece6dc", "#e0e3cf", "#bcc29a", "#8a9168", "#616850"],
  ],
  dark: [
    ["#2a2925", "#4a3326", "#7a4524", "#b85c26", "#ee7f3c"],
    ["#2a2925", "#3a332b", "#5f5141", "#a08a6d", "#e8d9c3"],
    ["#2a2925", "#2b3242", "#34497a", "#4265a0", "#8ea6d4"],
    ["#2a2925", "#33372a", "#4c5338", "#717958", "#a5ab91"],
  ],
};

/**
 * Each palette colour plus `steps` tints towards the next level's colour (up to `reach`).
 * Lets motion shimmer a tile's tone without ever showing a different level.
 * shades[row][level][step]; level 4 and level 0 do not shimmer.
 */
export function paletteShades(rows: string[][], steps = 4, reach = 0.35) {
  const rgb = (hex: string) => [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
  return rows.map((row) =>
    row.map((color, level) => {
      const next = row[level + 1];
      if (!next || level === 0) return [color];
      const [from, to] = [rgb(color), rgb(next)];
      return Array.from({ length: steps + 1 }, (_, step) => {
        const t = (step / steps) * reach;
        return `rgb(${from.map((value, index) => Math.round(value + (to[index] - value) * t)).join(",")})`;
      });
    }),
  );
}

const images = new Map<string, HTMLImageElement>();

function loadImage(src: string) {
  let image = images.get(src);
  if (!image) {
    image = new Image();
    image.decoding = "async";
    image.src = src;
    images.set(src, image);
  }
  return image;
}

export const markImage = (brand: OrgBrand) => loadImage(marks[brand].src);
export const gustavMarkImage = () => loadImage(gustavMarkSrc);
export const isReady = (image: HTMLImageElement) => image.complete && image.naturalWidth > 0;

/** Calls `onLoad` once per mark that finishes loading; returns a cleanup. */
export function onMarksLoad(onLoad: () => void) {
  const pending = [markImage("onlinesourdough"), markImage("arcitai"), gustavMarkImage()].filter((image) => !isReady(image));
  pending.forEach((image) => image.addEventListener("load", onLoad));
  return () => pending.forEach((image) => image.removeEventListener("load", onLoad));
}

/** Fits a mark's viewBox inside a square slot with some padding. */
export function markBox(brand: OrgBrand, x: number, y: number, size: number, padding = 0.18) {
  const [viewWidth, viewHeight] = marks[brand].view;
  const scale = (size * (1 - padding * 2)) / Math.max(viewWidth, viewHeight);
  const w = viewWidth * scale;
  const h = viewHeight * scale;
  return { x: x + (size - w) / 2, y: y + (size - h) / 2, w, h };
}

const sprites = new Map<string, HTMLCanvasElement>();

/**
 * The real mark on its brand panel, rendered once as a smooth vector (no pixelated
 * downsampling) at device resolution. The field draws it in fragments so it can
 * dissolve into and re-form from the tiles. `brand` indexes `brandOrder`.
 */
export function markSprite(brand: number, size: number, ratio: number) {
  const pixels = Math.max(1, Math.round(size * ratio));
  const key = `${brand}:${pixels}`;
  const cached = sprites.get(key);
  if (cached) return cached;
  const name = brandOrder[brand];
  const markBrand = name === "gustav" || name === undefined ? null : name;
  const image = markBrand ? markImage(markBrand) : gustavMarkImage();
  if (!isReady(image)) return null;
  const canvas = document.createElement("canvas");
  canvas.width = pixels;
  canvas.height = pixels;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.fillStyle = markBrand ? marks[markBrand].panel : gustavPanel;
  context.fillRect(0, 0, pixels, pixels);
  if (markBrand) {
    const box = markBox(markBrand, 0, 0, pixels);
    context.drawImage(image, box.x, box.y, box.w, box.h);
  } else {
    // The G image has a light ground; multiply keeps the G and its glow on the panel.
    context.globalCompositeOperation = "multiply";
    context.drawImage(image, 0, 0, pixels, pixels);
  }
  if (sprites.size >= 24) sprites.clear(); // Bounded: only a few sizes exist per layout.
  sprites.set(key, canvas);
  return canvas;
}

/** The organisation rows that may cue the field. */
export function brandForLabel(label: string): MarkBrand | undefined {
  if (label === "onlinesourdough") return "onlinesourdough";
  if (label === "Arc’IT AI") return "arcitai";
  return undefined;
}
