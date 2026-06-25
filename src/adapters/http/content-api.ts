import {
  parseWritingPostsResponse,
  type NewsletterSignupResponse,
  type WritingPost,
} from "../../../shared/contracts/content";

export async function fetchWritingPosts(endpoint: string): Promise<WritingPost[]> {
  try {
    const response = await fetch(endpoint);
    if (!response.ok) return [];

    return parseWritingPostsResponse(await response.json());
  } catch {
    return [];
  }
}

export async function postNewsletterSignup(
  endpoint: string,
  email: string,
  source: string,
): Promise<NewsletterSignupResponse> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, source }),
  });

  if (!response.ok) {
    throw new Error("Newsletter signup failed");
  }

  return response.json() as Promise<NewsletterSignupResponse>;
}
