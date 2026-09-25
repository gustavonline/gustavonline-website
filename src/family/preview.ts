/** Local review only. A production build never uses local destinations or mock writes. */
export const reviewPreview = import.meta.env.VITE_REVIEW_PREVIEW === "true";
export function isLocalReview(enabled: boolean, hostname: string) {
  return enabled && ["127.0.0.1", "localhost"].includes(hostname);
}
export const localReview = isLocalReview(reviewPreview, typeof window === "undefined" ? "" : window.location.hostname);
export type FamilyBrand = "gustavonline" | "onlinesourdough" | "arcitai";
const live = {
  gustavonline: "https://gustavonline.com",
  onlinesourdough: "https://onlinesourdough.com",
  arcitai: "https://arcitai.com",
};
const ports = { gustavonline: 4181, onlinesourdough: 4182, arcitai: 4183 };
export function familyHref(brand: FamilyBrand) {
  return localReview ? `http://127.0.0.1:${ports[brand]}` : live[brand];
}
/** No transport and no email persistence in the review build. */
export async function previewSubmission() {
  if (!localReview) throw new Error("Newsletter integration awaits release review.");
  await new Promise((resolve) => window.setTimeout(resolve, 650));
  if (new URLSearchParams(window.location.search).get("form") === "error")
    throw new Error("Preview error");
}
export async function previewSignup() {
  await previewSubmission();
  try { sessionStorage.setItem("family-preview-subscribed", "yes"); } catch { /* Optional preview receipt. */ }
}
export function previewReceipt() {
  try { return localReview && sessionStorage.getItem("family-preview-subscribed") === "yes"; }
  catch { return false; }
}
