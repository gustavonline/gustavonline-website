import { fetchWritingPosts, postNewsletterSignup } from "../adapters/http/content-api";
import { clientEnv } from "../config/client-env";
import { localReview } from "../family/preview";
import { siteData } from "../site-data";
import type { NewsletterSignupResponse } from "../../shared/contracts/content";

export async function fetchWriting(newslettersOnly = false) {
  if (localReview) return [];
  if (!clientEnv.writingEndpoint) return [];

  const endpoint = new URL(clientEnv.writingEndpoint, window.location.origin);
  if (newslettersOnly) endpoint.searchParams.set("format", "newsletter");
  return fetchWritingPosts(endpoint.href);
}

export async function submitNewsletterSignup(email: string): Promise<NewsletterSignupResponse> {
  if (!clientEnv.newsletterEndpoint) {
    throw new Error("Missing VITE_NEWSLETTER_ENDPOINT");
  }

  return postNewsletterSignup(clientEnv.newsletterEndpoint, email, siteData.brand);
}
