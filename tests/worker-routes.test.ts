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
                Type: { select: { name: "Edition" } },
                Status: { select: { name: "Published" } },
                Channels: { multi_select: [{ name: "Website" }, { name: "Newsletter" }] },
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
    const query = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(query.filter).toEqual({ and: [
      { property: "Status", select: { equals: "Published" } },
      { or: [
        { property: "Type", select: { equals: "Content" } },
        { property: "Type", select: { equals: "Edition" } },
      ] },
      { property: "Channels", multi_select: { contains: "Website" } },
      { property: "Public URL", url: { is_not_empty: true } },
    ] });
  });

  it("excludes sources, drafts, email-only editions and unsafe or missing destinations", async () => {
    const item = (type: string, status: string, channels: string[], url: string | null) => ({
      properties: {
        Type: { select: { name: type } },
        Status: { select: { name: status } },
        Channels: { multi_select: channels.map((name) => ({ name })) },
        Title: { title: [{ plain_text: "Private material" }] },
        "Public URL": { url },
        Slug: { rich_text: [{ plain_text: "must-not-create-a-public-route" }] },
      },
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ results: [
      item("Source", "Published", ["Website"], "https://example.com/source"),
      item("Content", "Draft", ["Website"], "https://example.com/draft"),
      item("Edition", "Published", ["Newsletter"], "https://example.com/email"),
      item("Content", "Published", ["Website"], null),
      item("Content", "Published", ["Website"], "javascript:alert(1)"),
      item("Content", "Published", ["Website"], "not a URL"),
      { properties: { Title: { title: [{ plain_text: "Unclassified" }] } } },
    ] })));
    const response = await worker.fetch(new Request("https://api.example.com/posts"), env);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ posts: [] });
  });

  it("returns an unavailable response when the content source cannot be read", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("private Notion error", { status: 403 }));
    const response = await worker.fetch(new Request("https://api.example.com/posts"), env);
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "Posts are temporarily unavailable. Please try again." });
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
