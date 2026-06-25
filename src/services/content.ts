import { fetchWritingPosts, postNewsletterSignup } from "../adapters/http/content-api";
import { clientEnv } from "../config/client-env";
import { siteData } from "../site-data";
import type { NewsletterSignupResponse, WritingPost } from "../../shared/contracts/content";

const fallbackPosts: WritingPost[] = siteData.writing.fallbackPosts;

export async function fetchWriting(): Promise<WritingPost[]> {
  if (!clientEnv.writingEndpoint) return fallbackPosts;

  const posts = await fetchWritingPosts(clientEnv.writingEndpoint);
  return posts.length > 0 ? posts : fallbackPosts;
}

export async function submitNewsletterSignup(email: string): Promise<NewsletterSignupResponse> {
  if (!clientEnv.newsletterEndpoint) {
    throw new Error("Missing VITE_NEWSLETTER_ENDPOINT");
  }

  return postNewsletterSignup(clientEnv.newsletterEndpoint, email, siteData.brand);
}
