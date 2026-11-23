import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "../worker/index";
import { renderBlocks } from "../worker/newsletter-renderer";
import { prepareNewsletter, type DraftLedger } from "../worker/newsletter-publishing";
import type { Env } from "../worker/types";

const env: Env = {
  ALLOWED_ORIGINS: "https://gustavonline.com", KIT_API_KEY: "test", NOTION_TOKEN: "test",
  NOTION_PAPERS_DATA_SOURCE_ID: "content-source", PUBLIC_SITE_URL: "https://gustavonline.com",
};
const text = (value: string) => [{ plain_text: value, type: "text", text: { content: value } }];
const edition = (status = "Published") => ({
  id: "edition-id", parent: { data_source_id: "content-source" },
  properties: {
    Type: { select: { name: "Edition" } }, Format: { select: { name: "Newsletter" } },
    Status: { select: { name: status } }, Channels: { multi_select: [{ name: "Newsletter" }] },
    Title: { title: text("A useful note") }, Summary: { rich_text: text("From the work") },
    Slug: { rich_text: text("a-useful-note") }, "Public URL": { url: "https://gustavonline.com/notes/a-useful-note" },
    "Publish date": { date: { start: "2026-11-22" } },
    "Send as newsletter": { checkbox: true }, "Kit broadcast id": { rich_text: text("") },
  },
});
const paragraph = { id: "p", type: "paragraph", paragraph: { rich_text: text("Hello <reader>") } };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
function ledger(): DraftLedger {
  let claimed = false; let id: number | undefined;
  return { claim: () => claimed ? false : (claimed = true), getId: () => id, saveId: (value) => { id = value; }, flush: async () => {} };
}
afterEach(() => vi.restoreAllMocks());

describe("published newsletter route", () => {
  it("renders a complete escaped issue from Notion, including subsequent block pages", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(reply({ results: [edition()] }))
      .mockResolvedValueOnce(reply({ results: [paragraph], has_more: true, next_cursor: "next" }))
      .mockResolvedValueOnce(reply({ results: [{ type: "heading_2", heading_2: { rich_text: text("More") } }], has_more: false }));
    const response = await worker.fetch(new Request("https://api.example/notes/a-useful-note"), env);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/html");
    const html = await response.text();
    expect(html).toContain("Hello &lt;reader&gt;"); expect(html).toContain("<h2>More</h2>");
    expect(html).toContain('href="https://gustavonline.com/newsletter#bookshelf"');
    expect(String(fetcher.mock.calls[2][0])).toContain("start_cursor=next");
  });
  it.each(["Draft", "Ready", "Archived"])("never reads the body of a %s edition", async (status) => {
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(reply({ results: [edition(status)] }));
    const response = await worker.fetch(new Request("https://api.example/notes/a-useful-note"), env);
    expect(response.status).toBe(404); expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("rejects ambiguous slugs and does not expose provider errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(reply({ results: [edition(), edition()] }));
    expect((await worker.fetch(new Request("https://api.example/notes/a-useful-note"), env)).status).toBe(404);
    vi.mocked(fetch).mockResolvedValue(reply({ error: "private failure" }, 403));
    const response = await worker.fetch(new Request("https://api.example/notes/a-useful-note"), env);
    expect(response.status).toBe(502); expect(await response.text()).not.toContain("private failure");
  });
  it.each(["wrong-format", "wrong-url", "future-date", "trashed", "source"])("keeps %s out of the public issue and newsletter feed", async (reason) => {
    const page = edition();
    if (reason === "wrong-format") page.properties.Format.select.name = "Article";
    if (reason === "wrong-url") page.properties["Public URL"].url = "https://example.com/private";
    if (reason === "future-date") page.properties["Publish date"].date.start = "2099-01-01";
    if (reason === "source") page.properties.Type.select.name = "Source";
    const result = { ...page, in_trash: reason === "trashed" };
    const fetcher = vi.spyOn(globalThis, "fetch").mockImplementation(async () => reply({ results: [result] }));
    const response = await worker.fetch(new Request("https://api.example/notes/a-useful-note"), env);
    expect(response.status).toBe(404); expect(fetcher).toHaveBeenCalledTimes(1);
    expect(await (await worker.fetch(new Request("https://api.example/posts?format=newsletter"), env)).json()).toEqual({ posts: [] });
  });
  it("includes a newsletter-channel edition, paginates the archive, and never creates a broadcast on reads", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(reply({ results: [], has_more: true, next_cursor: "next" }))
      .mockResolvedValueOnce(reply({ results: [edition()], has_more: false }));
    const response = await worker.fetch(new Request("https://api.example/posts?format=newsletter"), env);
    expect(await response.json()).toEqual({ posts: [{ title: "A useful note", summary: "From the work", date: "2026-11-22", url: "https://gustavonline.com/notes/a-useful-note" }] });
    expect(JSON.parse(String(fetcher.mock.calls[1][1]?.body)).start_cursor).toBe("next");
    expect(fetcher.mock.calls.every(([url]) => String(url).startsWith("https://api.notion.com/"))).toBe(true);
  });
  it("keeps unsafe links inert and refuses unsupported content instead of sending half an issue", () => {
    expect(renderBlocks([{ type: "paragraph", paragraph: { rich_text: [{ plain_text: "click", href: "javascript:alert(1)" }] } }])).not.toContain("javascript:");
    expect(() => renderBlocks([{ type: "child_page", child_page: { title: "Private" } }])).toThrow();
  });
});

describe("draft preparation", () => {
  it("creates one private unscheduled Kit draft and writes its ID back to Notion", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(reply(edition()))
      .mockResolvedValueOnce(reply({ results: [edition()] }))
      .mockResolvedValueOnce(reply({ results: [paragraph], has_more: false }))
      .mockResolvedValueOnce(reply({ broadcast: { id: 42, status: "draft", send_at: null, public: false } }))
      .mockResolvedValueOnce(reply({}));
    await prepareNewsletter("edition-id", env, ledger());
    const [url, options] = fetcher.mock.calls[3];
    expect(url).toBe("https://api.kit.com/v4/broadcasts");
    expect(JSON.parse(String(options?.body))).toMatchObject({ subject: "A useful note", send_at: null, public: false });
    expect(JSON.parse(String(options?.body)).content).toContain("Hello &lt;reader&gt;");
    expect(JSON.parse(String(fetcher.mock.calls[4][1]?.body)).properties["Kit broadcast id"].rich_text[0].text.content).toBe("42");
  });
  it("does nothing for a draft even when Send as newsletter is checked", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(reply(edition("Draft")));
    await prepareNewsletter("edition-id", env, ledger()); expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it.each(["already-created", "unchecked", "wrong-source"])("skips %s before reading any body or calling Kit", async (reason) => {
    const page = edition();
    if (reason === "already-created") page.properties["Kit broadcast id"].rich_text = text("42");
    if (reason === "unchecked") page.properties["Send as newsletter"].checkbox = false;
    if (reason === "wrong-source") page.parent.data_source_id = "another-source";
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(reply(page));
    await prepareNewsletter("edition-id", env, ledger()); expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("fails an unsupported body before making a durable claim or creating anything", async () => {
    const store = ledger(); const claim = vi.spyOn(store, "claim");
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(reply(edition()))
      .mockResolvedValueOnce(reply({ results: [edition()] }))
      .mockResolvedValueOnce(reply({ results: [{ type: "child_page" }] }));
    await expect(prepareNewsletter("edition-id", env, store)).rejects.toThrow();
    expect(claim).not.toHaveBeenCalled();
  });
  it("never repeats an uncertain create request, even when Kit has no visible match yet", async () => {
    const store = ledger();
    const fetcher = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(reply(edition())).mockResolvedValueOnce(reply({ results: [edition()] })).mockResolvedValueOnce(reply({ results: [paragraph] }))
      .mockRejectedValueOnce(new Error("timeout after Kit may have created the draft"));
    await expect(prepareNewsletter("edition-id", env, store)).rejects.toThrow();
    fetcher.mockResolvedValueOnce(reply(edition())).mockResolvedValueOnce(reply({ results: [edition()] })).mockResolvedValueOnce(reply({ results: [paragraph] }))
      .mockResolvedValueOnce(reply({ broadcasts: [], pagination: { has_next_page: false } }));
    await expect(prepareNewsletter("edition-id", env, store)).rejects.toThrow(/reconciliation/i);
    expect(fetcher.mock.calls.filter(([url, init]) => String(url).includes("api.kit.com") && init?.method === "POST")).toHaveLength(1);
  });
  it("retries a failed Notion write using the durable Kit ID without another create", async () => {
    const store = ledger();
    const fetcher = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(reply(edition())).mockResolvedValueOnce(reply({ results: [edition()] })).mockResolvedValueOnce(reply({ results: [paragraph] }))
      .mockResolvedValueOnce(reply({ broadcast: { id: 42, status: "draft", send_at: null, public: false } }))
      .mockResolvedValueOnce(reply({}, 503));
    await expect(prepareNewsletter("edition-id", env, store)).rejects.toThrow();
    fetcher.mockResolvedValueOnce(reply(edition())).mockResolvedValueOnce(reply({}));
    await prepareNewsletter("edition-id", env, store);
    expect(fetcher.mock.calls.filter(([url, init]) => String(url).includes("api.kit.com") && init?.method === "POST")).toHaveLength(1);
  });
  it("recovers an uncertain create from the exact Kit marker on a later page, even if already sent", async () => {
    const store = ledger(); store.claim();
    const fetcher = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(reply(edition())).mockResolvedValueOnce(reply({ results: [edition()] }))
      .mockResolvedValueOnce(reply({ results: [paragraph] }))
      .mockResolvedValueOnce(reply({ broadcasts: [], pagination: { has_next_page: true, end_cursor: "next" } }))
      .mockResolvedValueOnce(reply({ broadcasts: [{ id: 42, description: "gustavonline:newsletter:edition-id", status: "completed" }], pagination: { has_next_page: false } }))
      .mockResolvedValueOnce(reply({}));
    await prepareNewsletter("edition-id", env, store);
    expect(String(fetcher.mock.calls[4][0])).toContain("after=next");
    expect(store.getId()).toBe(42);
    expect(fetcher.mock.calls.filter(([url, init]) => String(url).includes("api.kit.com") && init?.method === "POST")).toHaveLength(0);
  });
});
