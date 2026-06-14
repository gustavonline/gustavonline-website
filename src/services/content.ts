import { site, staticWriting } from "../site-data";

export type WritingPost = (typeof staticWriting)[number];

export async function fetchWriting(): Promise<WritingPost[]> {
  const endpoint = import.meta.env.VITE_WRITING_ENDPOINT as string | undefined;

  if (!endpoint) return staticWriting;

  try {
    const response = await fetch(endpoint);
    if (!response.ok) return staticWriting;

    const data = (await response.json()) as { posts?: WritingPost[] };
    return data.posts?.length ? data.posts : staticWriting;
  } catch {
    return staticWriting;
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
    body: JSON.stringify({ email, source: site.brand }),
  });

  if (!response.ok) {
    throw new Error("Newsletter signup failed");
  }

  return response.json() as Promise<{ ok: true }>;
}
