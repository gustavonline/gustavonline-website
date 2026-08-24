import { describe, expect, it } from "vitest";

import { corsHeaders } from "../worker/http";
import type { Env } from "../worker/types";

const env: Env = {
  ALLOWED_ORIGINS: "https://gustavonline.com,https://www.gustavonline.com",
  KIT_API_KEY: "test-kit-key",
  NOTION_TOKEN: "test-notion-token",
  NOTION_PAPERS_DATA_SOURCE_ID: "papers-data-source",
  PUBLIC_SITE_URL: "https://gustavonline.com",
};

describe("Worker CORS policy", () => {
  it("reflects an explicitly allowlisted origin", () => {
    const headers = corsHeaders(
      new Request("https://api.example.com/posts", {
        headers: { Origin: "https://www.gustavonline.com" },
      }),
      env,
    );

    expect(headers["Access-Control-Allow-Origin"]).toBe(
      "https://www.gustavonline.com",
    );
  });

  it("does not grant CORS to an unlisted origin", () => {
    const headers = corsHeaders(
      new Request("https://api.example.com/posts", {
        headers: { Origin: "https://example.com" },
      }),
      env,
    );

    expect(headers["Access-Control-Allow-Origin"]).toBeUndefined();
  });
});
