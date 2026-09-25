import { localReview, previewReceipt, previewSignup, type FamilyBrand } from "./preview";

export const newsletterEndpoint =
  import.meta.env.VITE_NEWSLETTER_ENDPOINT ||
  "https://gustavonline-api.gustavonline.workers.dev/newsletter";
const receiptKey = "family-newsletter-confirmed-at";
const publicHosts = new Set([
  "gustavonline.com", "www.gustavonline.com",
  "onlinesourdough.com", "www.onlinesourdough.com",
  "arcitai.com", "www.arcitai.com",
]);

export async function postNewsletterSignup(
  email: string,
  source: FamilyBrand,
  fetcher: typeof fetch = fetch,
) {
  const response = await fetcher(newsletterEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim(), source }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error("Newsletter signup failed");
  const result: unknown = await response.json();
  if (!result || typeof result !== "object" || !("ok" in result) || result.ok !== true)
    throw new Error("Newsletter acknowledgement missing");
}

export async function submitNewsletter(email: string, source: FamilyBrand) {
  if (localReview) return previewSignup();
  if (!publicHosts.has(window.location.hostname))
    throw new Error("Live newsletter submissions are disabled on this host");
  await postNewsletterSignup(email, source);
  try { sessionStorage.setItem(receiptKey, String(Date.now())); }
  catch { /* The acknowledgement is real even when optional browser storage is unavailable. */ }
}

export function newsletterReceipt() {
  if (localReview) return previewReceipt();
  try {
    const time = Number(sessionStorage.getItem(receiptKey));
    return time > 0 && Date.now() >= time && Date.now() - time < 3_600_000;
  } catch { return false; }
}
