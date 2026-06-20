import { siteData } from "../site-data";

const fallbackPosts = siteData.writing.fallbackPosts;

export type WritingPost = (typeof fallbackPosts)[number];

export async function fetchWriting(): Promise<WritingPost[]> {
  const endpoint = import.meta.env.VITE_WRITING_ENDPOINT as string | undefined;

  if (!endpoint) return fallbackPosts;

  try {
    const response = await fetch(endpoint);
    if (!response.ok) return fallbackPosts;

    const data = (await response.json()) as { posts?: WritingPost[] };
    return data.posts?.length ? data.posts : fallbackPosts;
  } catch {
    return fallbackPosts;
  }
}

export async function submitNewsletterSignup(email: string) {
  const endpoint = import.meta.env.VITE_NEWSLETTER_ENDPOINT as string | undefined;

  if (!endpoint) {
    throw new Error("Missing VITE_NEWSLETTER_ENDPOINT");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, source: siteData.brand }),
  });

  if (!response.ok) {
    throw new Error("Newsletter signup failed");
  }

  return response.json() as Promise<{ ok: true }>;
}
