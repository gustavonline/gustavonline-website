import {
  parseWritingPostsResponse,
  type NewsletterSource,
  type NewsletterSignupResponse,
  type WritingPost,
} from "../../../shared/contracts/content";

export async function fetchWritingPosts(endpoint: string): Promise<WritingPost[]> {
  const response = await fetch(endpoint);

  if (!response.ok) {
    throw new Error("Writing archive request failed");
  }

  return parseWritingPostsResponse(await response.json());
}

export async function postNewsletterSignup(
  endpoint: string,
  email: string,
  source: NewsletterSource,
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
