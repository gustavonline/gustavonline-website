import type { WritingPost } from "../../shared/contracts/content";
import type { Env } from "../types";

export type NotionContent = {
  id?: string;
  archived?: boolean;
  in_trash?: boolean;
  parent?: { data_source_id?: string };
  properties?: {
    Type?: { select?: { name?: string } | null };
    Format?: { select?: { name?: string } | null };
    Status?: { select?: { name?: string } | null };
    Channels?: { multi_select?: Array<{ name?: string }> };
    Title?: { title?: Array<{ plain_text?: string }> };
    Summary?: { rich_text?: Array<{ plain_text?: string }> };
    "Public URL"?: { url?: string | null };
    "Publish date"?: { date?: { start?: string } | null };
    Slug?: { rich_text?: Array<{ plain_text?: string }> };
    "Send as newsletter"?: { checkbox?: boolean };
    "Kit broadcast id"?: { rich_text?: Array<{ plain_text?: string }> };
  };
};

export async function listPublishedPosts(env: Env, newslettersOnly = false): Promise<WritingPost[]> {
  const pages = await queryContent(env, newslettersOnly ? newsletterFilter : {
    and: [
      publishedNewsletterStatusFilter,
      { or: [
        { property: "Type", select: { equals: "Content" } },
        { property: "Type", select: { equals: "Edition" } },
      ] },
      { or: [
        { property: "Channels", multi_select: { contains: "Website" } },
        { property: "Format", select: { equals: "Newsletter" } },
      ] },
    ],
  });
  // Match /notes/:slug, whose identity query also sees other published editions
  // with this slug even if their public URL or publication date is not eligible.
  const slugCounts = new Map<string, number>();
  for (const page of pages) {
    if (!page.archived && !page.in_trash && isPublishedNewsletterStatus(page.properties?.Status?.select?.name)
        && page.properties?.Type?.select?.name === "Edition" && page.properties.Format?.select?.name === "Newsletter") {
      const slug = newsletterSlug(page);
      slugCounts.set(slug, (slugCounts.get(slug) ?? 0) + 1);
    }
  }
  return pages
    .filter((page) => (isPublicNewsletter(page, env) && slugCounts.get(newsletterSlug(page)) === 1)
      || (!newslettersOnly && !(page.properties?.Type?.select?.name === "Edition"
        && page.properties?.Format?.select?.name === "Newsletter") && isPublishedWebsiteContent(page)))
    .map(toPublicPost)
    .filter((post): post is WritingPost => post !== null);
}

function isPublishedWebsiteContent(page: NotionContent): boolean {
  const type = page.properties?.Type?.select?.name;
  return !page.archived && !page.in_trash && (type === "Content" || type === "Edition")
    && page.properties?.Status?.select?.name === "Published"
    && !!page.properties?.Channels?.multi_select?.some((channel) => channel.name === "Website");
}

export function toPublicPost(page: NotionContent): WritingPost | null {
  const title = page.properties?.Title?.title?.map((part) => part.plain_text ?? "").join("") ?? "";
  const summary = page.properties?.Summary?.rich_text?.map((part) => part.plain_text ?? "").join("") ?? "";
  const publicUrl = page.properties?.["Public URL"]?.url ?? "";
  const date = page.properties?.["Publish date"]?.date?.start ?? "";

  if (!title.trim() || !isHttpsUrl(publicUrl)) return null;

  return {
    title,
    summary,
    date,
    url: publicUrl,
  };
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isPublishedNewsletterStatus(status: string | undefined): boolean {
  return status === "Published" || status === "Publiceret";
}

const publishedNewsletterStatusFilter = { or: [
    { property: "Status", select: { equals: "Published" } },
    { property: "Status", select: { equals: "Publiceret" } },
  ] };

export const newsletterTypeFilters = [
  { property: "Type", select: { equals: "Edition" } },
  { property: "Format", select: { equals: "Newsletter" } },
];

export const newsletterFilter = { and: [
  publishedNewsletterStatusFilter,
  ...newsletterTypeFilters,
] };

export function newsletterSlug(page: NotionContent) {
  return page.properties?.Slug?.rich_text?.map((part) => part.plain_text ?? "").join("") ?? "";
}

export function validSlug(slug: string) {
  return slug.length <= 120 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

export function issueUrl(slug: string, env: Env) {
  return `${new URL(env.PUBLIC_SITE_URL).origin}/notes/${slug}`;
}

export function isPublicNewsletter(page: NotionContent, env: Env): boolean {
  const p = page.properties;
  const slug = newsletterSlug(page);
  const date = Date.parse(p?.["Publish date"]?.date?.start ?? "");
  return !page.archived && !page.in_trash
    && p?.Type?.select?.name === "Edition" && p.Format?.select?.name === "Newsletter"
    && isPublishedNewsletterStatus(p.Status?.select?.name) && validSlug(slug)
    && p["Public URL"]?.url === issueUrl(slug, env)
    && Number.isFinite(date) && date <= Date.now() && toPublicPost(page) !== null;
}

export async function queryContent(env: Env, filter: unknown): Promise<NotionContent[]> {
  const pages: NotionContent[] = [];
  let cursor: string | undefined;
  do {
    const data = await notionRequest<{ results: NotionContent[]; has_more?: boolean; next_cursor?: string }>(
      `data_sources/${env.NOTION_PAPERS_DATA_SOURCE_ID}/query`, env, "POST", {
        filter, sorts: [{ property: "Publish date", direction: "descending" }], page_size: 100,
        ...(cursor ? { start_cursor: cursor } : {}),
      });
    if (!Array.isArray(data.results)) throw new Error("Invalid Notion collection");
    pages.push(...data.results);
    if (pages.length > 1000) throw new Error("Content collection exceeds supported size");
    if (data.has_more && (!data.next_cursor || data.next_cursor === cursor)) throw new Error("Invalid Notion pagination");
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return pages;
}

export async function getPublicIssue(slug: string, env: Env) {
  if (!validSlug(slug)) return null;
  const pages = await queryContent(env, { and: [...newsletterFilter.and, { property: "Slug", rich_text: { equals: slug } }] });
  // Duplicate identities are an editorial error, never choose an arbitrary body.
  if (pages.length !== 1 || !isPublicNewsletter(pages[0], env) || !pages[0].id || newsletterSlug(pages[0]) !== slug) return null;
  const page = pages[0];
  return { ...toPublicPost(page)!, pageId: page.id!, body: await readIssueBody(page.id!, env) };
}

export type RichText = {
  type?: string; plain_text?: string; href?: string | null;
  text?: { content?: string; link?: { url?: string } | null };
  annotations?: { bold?: boolean; italic?: boolean; strikethrough?: boolean; code?: boolean; underline?: boolean };
};
export type NotionBlock = {
  id?: string; type: string; has_children?: boolean; children?: NotionBlock[];
  [key: string]: unknown;
};

// An explicit public container keeps editorial notes, old drafts and uploads
// on the same Notion page out of both the website and Kit draft rendering.
export const publicNewsletterLabel = "Public newsletter";

export async function readIssueBody(id: string, env: Env): Promise<NotionBlock[]> {
  let count = 0;
  async function children(blockId: string, depth: number): Promise<NotionBlock[]> {
    if (depth > 6) throw new Error("Issue nesting exceeds supported depth");
    const blocks: NotionBlock[] = [];
    let cursor: string | undefined;
    do {
      const params = new URLSearchParams({ page_size: "100", ...(cursor ? { start_cursor: cursor } : {}) });
      const data = await notionRequest<{ results: NotionBlock[]; has_more?: boolean; next_cursor?: string }>(`blocks/${blockId}/children?${params}`, env);
      if (!Array.isArray(data.results)) throw new Error("Invalid Notion blocks");
      count += data.results.length;
      if (count > 500) throw new Error("Issue exceeds supported size");
      blocks.push(...data.results);
      if (data.has_more && (!data.next_cursor || data.next_cursor === cursor)) throw new Error("Invalid block pagination");
      cursor = data.has_more ? data.next_cursor : undefined;
    } while (cursor);
    if (depth === 0) {
      const publicBlocks = blocks.filter((block) =>
        (block[block.type] as { rich_text?: RichText[] } | undefined)?.rich_text
          ?.map((part) => part.plain_text ?? part.text?.content ?? "").join("").trim().toLowerCase()
          === publicNewsletterLabel.toLowerCase());
      if (publicBlocks.length > 1) throw new Error("Ambiguous public newsletter body");
      if (publicBlocks.length === 1) {
        const block = publicBlocks[0];
        if (block.type !== "toggle") throw new Error("Public newsletter container must be a top-level toggle");
        if (!block.id || !block.has_children) throw new Error("Public newsletter body is empty");
        const body = await children(block.id, depth + 1);
        if (!body.length) throw new Error("Public newsletter body is empty");
        return body;
      }
    }
    for (const block of blocks) {
      if (block.has_children) {
        if (!block.id || ["child_page", "child_database", "synced_block"].includes(block.type)) throw new Error("Unsupported nested content");
        block.children = await children(block.id, depth + 1);
      }
    }
    return blocks;
  }
  return children(id, 0);
}

export async function notionRequest<T>(path: string, env: Env, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`https://api.notion.com/v1/${path}`, {
    method, headers: notionHeaders(env), ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("Notion request failed");
  return response.json() as Promise<T>;
}

function notionHeaders(env: Env) {
  return {
    Authorization: `Bearer ${env.NOTION_TOKEN}`,
    "Content-Type": "application/json",
    "Notion-Version": "2025-09-03",
  };
}
