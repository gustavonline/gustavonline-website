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
  return { isClaimed: () => claimed, claim: () => claimed ? false : (claimed = true), getId: () => id, saveId: (value) => { id = value; }, flush: async () => {} };
}
afterEach(() => vi.restoreAllMocks());

describe("published newsletter route", () => {
  it.each(["Published", "Publiceret"])("renders a complete escaped %s issue from Notion, including subsequent block pages", async (status) => {
    const fetcher = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(reply({ results: [edition(status)] }))
      .mockResolvedValueOnce(reply({ results: [paragraph], has_more: true, next_cursor: "next" }))
      .mockResolvedValueOnce(reply({ results: [{ type: "heading_2", heading_2: { rich_text: text("More") } }], has_more: false }));
    const response = await worker.fetch(new Request("https://api.example/notes/a-useful-note"), env);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/html");
    const html = await response.text();
    expect(html).toContain("Hello &lt;reader&gt;"); expect(html).toContain("<h2>More</h2>");
    expect(html).toContain('href="https://gustavonline.com/newsletter#bookshelf"');
    expect(String(fetcher.mock.calls[2][0])).toContain("start_cursor=next");
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body)).filter.and[0]).toEqual({ or: [
      { property: "Status", select: { equals: "Published" } },
      { property: "Status", select: { equals: "Publiceret" } },
    ] });
  });
  it("reads only the explicit public container, even when it is on a later root page", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(reply({ results: [edition("Publiceret")] }))
      .mockResolvedValueOnce(reply({ results: [
        { id: "private", type: "synced_block", has_children: true },
        { type: "embed", embed: { url: "https://private.example/draft" } },
      ], has_more: true, next_cursor: "public-page" }))
      .mockResolvedValueOnce(reply({ results: [
        { id: "public", type: "toggle", has_children: true, toggle: { rich_text: text("Public newsletter") } },
      ] }))
      .mockResolvedValueOnce(reply({ results: [paragraph, { type: "image", image: {
        type: "external", external: { url: "https://gustavonline.com/assets/notes/photo.jpg" }, caption: text("Photo"),
      } }] }));
    const response = await worker.fetch(new Request("https://api.example/notes/a-useful-note"), env);
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("Hello &lt;reader&gt;");
    expect(html).toContain('src="https://gustavonline.com/assets/notes/photo.jpg"');
    expect(html).not.toContain("private.example");
    expect(String(fetcher.mock.calls[3][0])).toContain("blocks/public/children");
    expect(fetcher).toHaveBeenCalledTimes(4);
  });
  it.each(["empty", "duplicate"])("fails closed for an %s public container", async (reason) => {
    const block = { id: "public", type: "toggle", has_children: false, toggle: { rich_text: text("Public newsletter") } };
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(reply({ results: [edition()] }))
      .mockResolvedValueOnce(reply({ results: [paragraph, block, ...(reason === "duplicate" ? [block] : [])] }));
    const response = await worker.fetch(new Request("https://api.example/notes/a-useful-note"), env);
    expect(response.status).toBe(502); expect(await response.text()).not.toContain("Hello");
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
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
  it.each(["/posts?format=newsletter", "/posts"])("excludes duplicate-slug editions from %s as well as the issue route", async (path) => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => reply({ results: [edition(), edition("Publiceret")] }));
    expect(await (await worker.fetch(new Request(`https://api.example${path}`), env)).json()).toEqual({ posts: [] });
    expect((await worker.fetch(new Request("https://api.example/notes/a-useful-note"), env)).status).toBe(404);
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
  it.each(["Published", "Publiceret"])("includes a %s newsletter-channel edition, paginates the archive, and never creates a broadcast on reads", async (status) => {
    const fetcher = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(reply({ results: [], has_more: true, next_cursor: "next" }))
      .mockResolvedValueOnce(reply({ results: [edition(status)], has_more: false }));
    const response = await worker.fetch(new Request("https://api.example/posts?format=newsletter"), env);
    expect(await response.json()).toEqual({ posts: [{ title: "A useful note", summary: "From the work", date: "2026-11-22", url: "https://gustavonline.com/notes/a-useful-note" }] });
    expect(JSON.parse(String(fetcher.mock.calls[1][1]?.body)).start_cursor).toBe("next");
    expect(fetcher.mock.calls.every(([url]) => String(url).startsWith("https://api.notion.com/"))).toBe(true);
  });
  it("preserves ordinary Website content with Newsletter format in the general feed", async () => {
    const page = edition(); page.properties.Type.select.name = "Content";
    page.properties.Channels.multi_select = [{ name: "Website" }];
    page.properties["Public URL"].url = "https://example.com/published-article";
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => reply({ results: [page] }));
    expect(await (await worker.fetch(new Request("https://api.example/posts"), env)).json()).toEqual({ posts: [
      { title: "A useful note", summary: "From the work", date: "2026-11-22", url: "https://example.com/published-article" },
    ] });
    expect(await (await worker.fetch(new Request("https://api.example/posts?format=newsletter"), env)).json()).toEqual({ posts: [] });
  });
  it("keeps unsafe links inert and refuses unsupported content instead of sending half an issue", () => {
    expect(renderBlocks([{ type: "paragraph", paragraph: { rich_text: [{ plain_text: "click", href: "javascript:alert(1)" }] } }])).not.toContain("javascript:");
    expect(() => renderBlocks([{ type: "child_page", child_page: { title: "Private" } }])).toThrow();
  });
  it("serves HEAD with the same policy headers and no body", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(reply({ results: [edition()] }))
      .mockResolvedValueOnce(reply({ results: [paragraph] }));
    const response = await worker.fetch(new Request("https://api.example/notes/a-useful-note", { method: "HEAD" }), env);
    expect(response.status).toBe(200); expect(await response.text()).toBe("");
    expect(response.headers.get("Content-Security-Policy")).toContain("default-src 'none'");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});

describe("draft preparation", () => {
  it("creates one private unscheduled Kit draft and writes its ID back to Notion", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(reply(edition()))
      .mockResolvedValueOnce(reply({ results: [edition()] }))
      .mockResolvedValueOnce(reply({ results: [paragraph], has_more: false }))
      .mockResolvedValueOnce(reply({ broadcast: { id: 42, send_at: null, public: false } }))
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
    const page = edition("Publiceret");
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
  it.each([
    { status: "scheduled", send_at: null, public: false },
    { status: "draft", send_at: "2099-01-01", public: false },
    { send_at: null, public: true },
  ])("rejects unsafe Kit acknowledgement %j and never records a draft ID", async (broadcast) => {
    const store = ledger();
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(reply(edition()))
      .mockResolvedValueOnce(reply({ results: [edition()] })).mockResolvedValueOnce(reply({ results: [paragraph] }))
      .mockResolvedValueOnce(reply({ broadcast: { id: 42, ...broadcast } }));
    await expect(prepareNewsletter("edition-id", env, store)).rejects.toThrow(/acknowledgement/);
    expect(store.getId()).toBeUndefined(); expect(store.claim()).toBe(false);
  });
  it("never repeats an uncertain create request, even when Kit has no visible match yet", async () => {
    const store = ledger();
    const fetcher = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(reply(edition())).mockResolvedValueOnce(reply({ results: [edition()] })).mockResolvedValueOnce(reply({ results: [paragraph] }))
      .mockRejectedValueOnce(new Error("timeout after Kit may have created the draft"));
    await expect(prepareNewsletter("edition-id", env, store)).rejects.toThrow();
    fetcher.mockResolvedValueOnce(reply(edition()))
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
      .mockResolvedValueOnce(reply(edition()))
      .mockResolvedValueOnce(reply({ broadcasts: [], pagination: { has_next_page: true, end_cursor: "next" } }))
      .mockResolvedValueOnce(reply({ broadcasts: [{ id: 42, description: "gustavonline:newsletter:edition-id", status: "completed" }], pagination: { has_next_page: false } }))
      .mockResolvedValueOnce(reply({}));
    await prepareNewsletter("edition-id", env, store);
    expect(String(fetcher.mock.calls[2][0])).toContain("after=next");
    expect(store.getId()).toBe(42);
    expect(fetcher.mock.calls.filter(([url, init]) => String(url).includes("api.kit.com") && init?.method === "POST")).toHaveLength(0);
  });
});

describe("newsletter cron dispatch", () => {
  it("continues after a transport error, skips drafts and reports aggregate failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const query = vi.spyOn(globalThis, "fetch").mockResolvedValue(reply({ results: [
      edition(), { ...edition(), id: "second-edition" }, edition("Draft"),
    ] }));
    const dispatch = vi.fn().mockRejectedValueOnce(new Error("transport failed"))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const id: DurableObjectId = { toString: () => "synthetic-id", equals: () => true };
    const namespace: NonNullable<Env["NEWSLETTER_DRAFTS"]> = {
      newUniqueId: () => id, idFromName: () => id, idFromString: () => id,
      get: vi.fn().mockReturnValue({ id, fetch: dispatch }),
      getByName: vi.fn(), jurisdiction: vi.fn(),
    };
    await expect(worker.scheduled({} as ScheduledController, { ...env, NEWSLETTER_DRAFTS: namespace })).rejects.toThrow(/needs attention/);
    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(String(dispatch.mock.calls[1][0])).toBe("https://draft.internal/second-edition");
    expect(JSON.parse(String(query.mock.calls[0][1]?.body)).filter.and).toEqual([
      { property: "Status", select: { equals: "Published" } },
      { property: "Type", select: { equals: "Edition" } },
      { property: "Format", select: { equals: "Newsletter" } },
      { property: "Send as newsletter", checkbox: { equals: true } },
      { property: "Kit broadcast id", rich_text: { is_empty: true } },
    ]);
  });
});
