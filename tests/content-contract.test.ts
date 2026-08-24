import { describe, expect, it } from "vitest";

import {
  normalizeNewsletterSignupPayload,
  parseWritingPostsResponse,
} from "../shared/contracts/content";

describe("content contracts", () => {
  it("normalizes newsletter signup payloads at the API boundary", () => {
    const result = normalizeNewsletterSignupPayload(
      {
        email: " HELLO@GUSTAVONLINE.COM ",
        source: " gustavonline ",
      },
      "gustavonline",
    );

    expect(result).toEqual({
      ok: true,
      value: {
        email: "hello@gustavonline.com",
        source: "gustavonline",
      },
    });
  });

  it("accepts only explicit newsletter source values", () => {
    expect(
      normalizeNewsletterSignupPayload(
        { email: "hello@example.com", source: "arcitai" },
        "gustavonline",
      ),
    ).toEqual({
      ok: true,
      value: {
        email: "hello@example.com",
        source: "arcitai",
      },
    });

    expect(
      normalizeNewsletterSignupPayload(
        { email: "hello@example.com", source: "arbitrary-client-value" },
        "gustavonline",
      ),
    ).toEqual({
      ok: false,
      error: "Invalid newsletter source",
    });
  });

  it("rejects invalid newsletter emails", () => {
    expect(
      normalizeNewsletterSignupPayload({ email: "nope" }, "gustavonline"),
    ).toEqual({
      ok: false,
      error: "Invalid email",
    });
  });

  it("keeps only valid writing posts from remote responses", () => {
    expect(
      parseWritingPostsResponse({
        posts: [
          {
            title: "Valid note",
            summary: "A note summary",
            date: "2026-06-25",
            url: "https://gustavonline.com/notes/valid-note",
          },
          {
            title: "",
            summary: "Missing title",
            date: "2026-06-25",
            url: "https://gustavonline.com/notes/missing-title",
          },
          {
            title: "Missing URL",
            summary: "No URL",
            date: "2026-06-25",
          },
        ],
      }),
    ).toEqual([
      {
        title: "Valid note",
        summary: "A note summary",
        date: "2026-06-25",
        url: "https://gustavonline.com/notes/valid-note",
      },
    ]);
  });
});
