import { describe, expect, it } from "vitest";

import { landingLayoutHref, landingPreviewHref, parseLandingLayout, parseLandingMotion } from "./useLandingLayout";

describe("landing layout preview", () => {
  it("defaults to the preferred top layout and keeps earlier preview links working", () => {
    expect(parseLandingLayout("")).toBe("top");
    expect(parseLandingLayout("?layout=unknown")).toBe("top");
    expect(parseLandingLayout("?layout=reveal")).toBe("top");
    expect(parseLandingLayout("?layout=side")).toBe("left");
  });

  it("selects each placement from the query", () => {
    expect(parseLandingLayout("?theme=dark&layout=top")).toBe("top");
    expect(parseLandingLayout("?layout=profile")).toBe("profile");
    expect(parseLandingLayout("?layout=left")).toBe("left");
  });

  it("keeps other query params when switching", () => {
    expect(landingLayoutHref("profile", "?theme=dark&layout=top")).toBe("?theme=dark&layout=profile");
    expect(landingLayoutHref("left", "")).toBe("?layout=left");
  });

  it("defaults the motion concept to the chosen reveal and keeps flow reachable", () => {
    expect(parseLandingMotion("")).toBe("reveal");
    expect(parseLandingMotion("?motion=unknown")).toBe("reveal");
    expect(parseLandingMotion("?layout=left&motion=reveal")).toBe("reveal");
    expect(parseLandingMotion("?motion=flow")).toBe("flow");
  });

  it("maps the retired assemble concept to reveal", () => {
    expect(parseLandingMotion("?layout=top&motion=assemble")).toBe("reveal");
  });

  it("switches placement and motion independently", () => {
    expect(landingPreviewHref({ motion: "reveal" }, "?theme=dark&layout=left")).toBe("?theme=dark&layout=left&motion=reveal");
    expect(landingPreviewHref({ layout: "top" }, "?layout=left&motion=reveal")).toBe("?layout=top&motion=reveal");
  });
});
