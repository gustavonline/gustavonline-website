import { fetchWritingPosts, postNewsletterSignup } from "../adapters/http/content-api";
import { clientEnv } from "../config/client-env";
import { siteData } from "../site-data";
import type { NewsletterSignupResponse } from "../../shared/contracts/content";

export async function fetchWriting() {
  if (!clientEnv.writingEndpoint) return [];

  return fetchWritingPosts(clientEnv.writingEndpoint);
}

export async function submitNewsletterSignup(email: string): Promise<NewsletterSignupResponse> {
  if (!clientEnv.newsletterEndpoint) {
    throw new Error("Missing VITE_NEWSLETTER_ENDPOINT");
  }

  return postNewsletterSignup(clientEnv.newsletterEndpoint, email, siteData.brand);
}
