export type WritingPost = {
  title: string;
  summary: string;
  date: string;
  url: string;
};

export type WritingPostsResponse = {
  posts: WritingPost[];
};

export type NewsletterSignupPayload = {
  email: string;
  source: string;
};

export type NewsletterSignupResponse = {
  ok: true;
};

export type ValidationResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      error: string;
    };

export function parseWritingPostsResponse(value: unknown): WritingPost[] {
  const record = toRecord(value);

  if (!Array.isArray(record?.posts)) {
    return [];
  }

  return record.posts.filter(isWritingPost);
}

export function normalizeNewsletterSignupPayload(
  value: unknown,
  fallbackSource: string,
): ValidationResult<NewsletterSignupPayload> {
  const record = toRecord(value);
  const email = typeof record?.email === "string" ? record.email.trim().toLowerCase() : "";
  const source =
    typeof record?.source === "string" && record.source.trim().length > 0 ? record.source.trim() : fallbackSource;

  if (!isValidEmail(email)) {
    return {
      ok: false,
      error: "Invalid email",
    };
  }

  return {
    ok: true,
    value: {
      email,
      source,
    },
  };
}

export function isWritingPost(value: unknown): value is WritingPost {
  const record = toRecord(value);

  return (
    typeof record?.title === "string" &&
    record.title.trim().length > 0 &&
    typeof record.summary === "string" &&
    typeof record.date === "string" &&
    typeof record.url === "string" &&
    record.url.trim().length > 0
  );
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}
