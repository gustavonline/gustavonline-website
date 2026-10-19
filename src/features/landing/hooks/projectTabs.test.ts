import { describe, expect, it } from "vitest";

import { nextTabIndex } from "./projectTabs";

describe("project tabs keyboard", () => {
  it("wraps with arrows and jumps with Home and End", () => {
    expect(nextTabIndex(2, "ArrowRight", 3)).toBe(0);
    expect(nextTabIndex(0, "ArrowLeft", 3)).toBe(2);
    expect(nextTabIndex(1, "Home", 3)).toBe(0);
    expect(nextTabIndex(0, "End", 3)).toBe(2);
    expect(nextTabIndex(1, "Enter", 3)).toBeNull();
  });
});
