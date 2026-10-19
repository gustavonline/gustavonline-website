export type LandingLayout = "top" | "profile" | "left";
export type LandingMotion = "flow" | "reveal";

/** Keep earlier preview URLs working; the owner's preferred top placement is the default. */
export function parseLandingLayout(search: string): LandingLayout {
  const layout = new URLSearchParams(search).get("layout");
  if (layout === "profile") return "profile";
  if (layout === "left" || layout === "side") return "left";
  return "top";
}

/** Reveal is the chosen default; `?motion=flow` keeps the earlier preview reachable. */
export function parseLandingMotion(search: string): LandingMotion {
  return new URLSearchParams(search).get("motion") === "flow" ? "flow" : "reveal";
}

/** Keeps every other query param (for example `theme`) when switching previews. */
export function landingPreviewHref(change: { layout?: LandingLayout; motion?: LandingMotion }, search: string) {
  const params = new URLSearchParams(search);
  if (change.layout) params.set("layout", change.layout);
  if (change.motion) params.set("motion", change.motion);
  return `?${params.toString()}`;
}

export function landingLayoutHref(layout: LandingLayout, search: string) {
  return landingPreviewHref({ layout }, search);
}

export function useLandingPreview() {
  const search = typeof window === "undefined" ? "" : window.location.search;
  return { layout: parseLandingLayout(search), motion: parseLandingMotion(search) };
}
