import type { ShelfBriefBook } from "./types";

const serif = 'Georgia, "Iowan Old Style", "Times New Roman", serif';
const mono = 'ui-monospace, "SFMono-Regular", Consolas, monospace';

function canvas(width: number, height: number) {
  const element = document.createElement("canvas");
  element.width = width;
  element.height = height;
  return element;
}

function context(element: HTMLCanvasElement) {
  const value = element.getContext("2d");
  if (!value) throw new Error("Canvas 2D context is unavailable");
  return value;
}

function wrap(ctx: CanvasRenderingContext2D, value: string, maxWidth: number, maxLines: number) {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth || !line) {
      line = next;
    } else {
      lines.push(line);
      line = word;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

function drawDither(ctx: CanvasRenderingContext2D, width: number, height: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.18;
  for (let y = 18; y < height; y += 24) {
    for (let x = (y / 24) % 2 ? 14 : 26; x < width; x += 24) {
      ctx.fillRect(x, y, 3, 3);
    }
  }
  ctx.restore();
}

export function createFrontCover(book: ShelfBriefBook) {
  const element = canvas(900, 1120);
  const ctx = context(element);
  ctx.fillStyle = book.cover;
  ctx.fillRect(0, 0, element.width, element.height);
  drawDither(ctx, element.width, element.height, book.ink);

  ctx.strokeStyle = book.accent;
  ctx.lineWidth = 7;
  ctx.strokeRect(48, 48, element.width - 96, element.height - 96);
  ctx.fillStyle = book.accent;
  ctx.fillRect(48, 48, 190, 12);
  ctx.fillRect(element.width - 238, element.height - 60, 190, 12);

  ctx.fillStyle = book.titleColor ?? book.ink;
  ctx.font = `700 28px ${mono}`;
  ctx.letterSpacing = "2px";
  ctx.fillText(book.placeholder ? "ARCHIVE BOOKEND" : "GUSTAV ONLINE", 82, 126);

  ctx.font = `600 76px ${serif}`;
  const titleLines = wrap(ctx, book.title, element.width - 164, 5);
  titleLines.forEach((line, index) => ctx.fillText(line, 82, 310 + index * 88));

  ctx.font = `500 27px ${mono}`;
  ctx.fillStyle = book.accent;
  ctx.fillText(book.placeholder ? "NOT A PUBLISHED ISSUE" : book.date, 82, 920);

  if (book.tagline) {
    ctx.font = `400 30px ${serif}`;
    ctx.fillStyle = book.titleColor ?? book.ink;
    wrap(ctx, book.tagline, element.width - 164, 2).forEach((line, index) => {
      ctx.fillText(line, 82, 984 + index * 38);
    });
  }
  return element;
}

export function createSpineCover(book: ShelfBriefBook) {
  const element = canvas(240, 1120);
  const ctx = context(element);
  ctx.fillStyle = book.cover;
  ctx.fillRect(0, 0, element.width, element.height);
  drawDither(ctx, element.width, element.height, book.ink);
  ctx.fillStyle = book.accent;
  ctx.fillRect(0, 0, 18, element.height);
  ctx.fillRect(element.width - 18, 0, 18, element.height);
  ctx.save();
  ctx.translate(element.width / 2 + 17, element.height - 64);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = book.titleColor ?? book.ink;
  ctx.font = `700 35px ${mono}`;
  ctx.letterSpacing = "2px";
  const label = book.placeholder ? "ARCHIVE STARTS HERE · NO ISSUES YET" : book.shortTitle;
  ctx.fillText(label.slice(0, 42).toUpperCase(), 0, 0);
  ctx.restore();
  return element;
}

export function createBackCover(book: ShelfBriefBook) {
  const element = canvas(900, 1120);
  const ctx = context(element);
  ctx.fillStyle = book.cover;
  ctx.fillRect(0, 0, element.width, element.height);
  drawDither(ctx, element.width, element.height, book.ink);
  ctx.strokeStyle = book.accent;
  ctx.lineWidth = 7;
  ctx.strokeRect(48, 48, element.width - 96, element.height - 96);
  ctx.fillStyle = book.titleColor ?? book.ink;
  ctx.font = `700 30px ${mono}`;
  ctx.fillText("GUSTAV ONLINE / NEWSLETTER", 82, 126);
  ctx.font = `400 42px ${serif}`;
  wrap(ctx, book.tagline ?? "Practical notes from the work as it evolves.", element.width - 164, 5)
    .forEach((line, index) => ctx.fillText(line, 82, 290 + index * 54));
  return element;
}

export function createPlaceholderFront(book: ShelfBriefBook) {
  return createFrontCover(book);
}

export function createPlaceholderSpine(book: ShelfBriefBook) {
  return createSpineCover(book);
}
