import { afterEach, describe, expect, it, vi } from "vitest";

import worker from "../worker/index";
import type { Env } from "../worker/types";

const env: Env = {
  ALLOWED_ORIGINS: "https://gustavonline.com",
  KIT_API_KEY: "unused",
  NOTION_TOKEN: "unused",
  NOTION_PAPERS_DATA_SOURCE_ID: "papers-data-source",
  PUBLIC_SITE_URL: "https://gustavonline.com",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Worker public routes", () => {
  it("acknowledges a valid Kit subscriber without returning personal data", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      subscriber: { id: 123, state: "active" },
    })));
    const response = await worker.fetch(new Request("https://api.example.com/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://gustavonline.com" },
      body: JSON.stringify({ email: "reader@example.com", source: "arcitai" }),
    }), env);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it("does not turn malformed Kit success into a subscription acknowledgement", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    const response = await worker.fetch(new Request("https://api.example.com/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "reader@example.com", source: "gustavonline" }),
    }), env);
    expect(response.status).toBe(502);
  });

  it("keeps provider failures generic and records only the HTTP status", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("private upstream detail", {status:401}));
    const response = await worker.fetch(new Request("https://api.example.com/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "reader@example.com", source: "onlinesourdough" }),
    }), env);
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("private upstream detail");
    expect(log).toHaveBeenCalledWith("kit_subscriber_request_failed", {status:401});
  });

  it("serves published posts from the Notion-backed source", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            {
              properties: {
                Title: { title: [{ plain_text: "A public note" }] },
                Summary: { rich_text: [{ plain_text: "A short summary" }] },
                Slug: { rich_text: [{ plain_text: "a-public-note" }] },
                "Public URL": { url: "https://gustavonline.com/notes/a-public-note" },
                "Publish date": { date: { start: "2026-08-24" } },
              },
            },
          ],
        }),
        { headers: { "Content-Type": "application/json" } },
      ),
    );

    const response = await worker.fetch(
      new Request("https://api.example.com/posts"),
      env,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      posts: [
        {
          title: "A public note",
          summary: "A short summary",
          date: "2026-08-24",
          url: "https://gustavonline.com/notes/a-public-note",
        },
      ],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.notion.com/v1/data_sources/papers-data-source/query",
      expect.any(Object),
    );
  });

  it("rejects an unallowlisted newsletter source before calling Kit", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");

    const response = await worker.fetch(
      new Request("https://api.example.com/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "hello@example.com",
          source: "untrusted-client-value",
        }),
      }),
      env,
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Invalid newsletter source",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
