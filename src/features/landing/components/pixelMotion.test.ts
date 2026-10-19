import { describe, expect, it } from "vitest";

import { fragmentState, loosenFragment, nearestZone, revealZone, wanderCell } from "./pixelMotion";

describe("reveal activation", () => {
  it("follows the mouse over a zone even when a project cue or an old tap exists", () => {
    expect(revealZone({ inField: true, hover: 2, cue: 0, pinned: 1 })).toBe(2);
  });

  it("keeps every logo closed when the mouse is in the field between zones, ignoring stale cues and pins", () => {
    expect(revealZone({ inField: true, hover: -1, cue: 0, pinned: 1 })).toBe(-1);
  });

  it("uses a project cue when the mouse is off the field, then a touch pin", () => {
    expect(revealZone({ inField: false, hover: -1, cue: 1, pinned: 2 })).toBe(1);
    expect(revealZone({ inField: false, hover: -1, cue: -1, pinned: 2 })).toBe(2);
    expect(revealZone({ inField: false, hover: -1, cue: -1, pinned: -1 })).toBe(-1);
  });

  it("opens only a zone whose centre is within the hit radius", () => {
    const centers = [{ x: 150, y: 50 }, { x: 300, y: 60 }, { x: 450, y: 55 }];
    expect(nearestZone(160, 60, centers, 40)).toBe(0);
    expect(nearestZone(320, 70, centers, 40)).toBe(1);
    expect(nearestZone(225, 55, centers, 40)).toBe(-1); // Between zones: neutral field.
    expect(nearestZone(10, 10, centers, 40)).toBe(-1);
    expect(nearestZone(10, 10, centers)).toBe(0); // Unbounded radius picks the nearest.
    expect(nearestZone(0, 0, [], 40)).toBe(-1);
  });
});

const everyFragment = (perSide: number, progress: number) =>
  Array.from({ length: perSide * perSide }, (_, index) => fragmentState(index % perSide, Math.floor(index / perSide), perSide, progress, 7));

describe("mark fragments", () => {
  it("are fully assembled in place at rest, so the real mark stays exact", () => {
    for (const fragment of everyFragment(8, 1)) {
      expect(fragment.visible).toBe(true);
      expect(fragment.alpha).toBe(1);
      expect(fragment.scale).toBeCloseTo(1);
      expect(fragment.dx).toBeCloseTo(0);
      expect(fragment.dy).toBeCloseTo(0);
    }
  });

  it("are all melted into the field when closed", () => {
    expect(everyFragment(8, 0).some((fragment) => fragment.visible)).toBe(false);
  });

  it("form from the centre outwards", () => {
    const centre = fragmentState(3, 3, 8, 0.3, 7);
    const corner = fragmentState(0, 0, 8, 0.3, 7);
    expect(centre.visible).toBe(true);
    expect(corner.visible).toBe(false);
  });
});

describe("pointer loosening", () => {
  it("leaves a settled fragment exactly in place without pointer motion", () => {
    const fragment = loosenFragment(0, 5, -3, 4, 7);
    expect(fragment.dx).toBeCloseTo(0);
    expect(fragment.dy).toBeCloseTo(0);
    expect(fragment.scale).toBe(1);
    expect(fragment.alpha).toBe(1);
  });

  it("pushes away from the pointer but stays bounded and recognisable", () => {
    const fragment = loosenFragment(5, 10, 0, 4, 7);
    expect(fragment.dx).toBeGreaterThan(0);
    expect(Math.hypot(fragment.dx, fragment.dy)).toBeLessThan(10);
    expect(fragment.scale).toBeGreaterThanOrEqual(0.65);
    expect(fragment.alpha).toBeGreaterThanOrEqual(0.7);
  });
});

describe("flow wander path", () => {
  it("keeps the mark inside the usable field at all times", () => {
    for (let time = 0; time < 200_000; time += 997) {
      const cell = wanderCell(time, 36, 9, 3);
      expect(cell.x).toBeGreaterThanOrEqual(0);
      expect(cell.x).toBeLessThanOrEqual(33);
      expect(cell.y).toBeGreaterThanOrEqual(0);
      expect(cell.y).toBeLessThanOrEqual(6);
    }
  });

  it("keeps moving without any pointer input", () => {
    const visited = new Set<string>();
    for (let time = 0; time < 30_000; time += 1000) {
      const cell = wanderCell(time, 36, 9, 3);
      visited.add(`${cell.x},${cell.y}`);
    }
    expect(visited.size).toBeGreaterThan(8);
  });
});
