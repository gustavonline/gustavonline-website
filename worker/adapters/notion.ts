import type { WritingPost } from "../../shared/contracts/content";
import type { Env } from "../types";

type NotionContent = {
  properties?: {
    Type?: { select?: { name?: string } | null };
    Status?: { select?: { name?: string } | null };
    Channels?: { multi_select?: Array<{ name?: string }> };
    Title?: { title?: Array<{ plain_text?: string }> };
    Summary?: { rich_text?: Array<{ plain_text?: string }> };
    "Public URL"?: { url?: string | null };
    "Publish date"?: { date?: { start?: string } | null };
  };
};

export async function listPublishedPosts(env: Env): Promise<WritingPost[]> {
  const notionResponse = await fetch(
    `https://api.notion.com/v1/data_sources/${env.NOTION_PAPERS_DATA_SOURCE_ID}/query`,
    {
      method: "POST",
      headers: notionHeaders(env),
      body: JSON.stringify({
        filter: {
          and: [
            { property: "Status", select: { equals: "Published" } },
            { or: [
              { property: "Type", select: { equals: "Content" } },
              { property: "Type", select: { equals: "Edition" } },
            ] },
            { property: "Channels", multi_select: { contains: "Website" } },
            { property: "Public URL", url: { is_not_empty: true } },
          ],
        },
        sorts: [
          {
            property: "Publish date",
            direction: "descending",
          },
        ],
        page_size: 20,
      }),
    },
  );

  if (!notionResponse.ok) {
    throw new Error("Published content request failed");
  }

  const data = (await notionResponse.json()) as { results?: NotionContent[] };
  return (data.results ?? [])
    .filter(isPublishedWebsiteContent)
    .map(toPublicPost)
    .filter((post): post is WritingPost => post !== null);
}

function isPublishedWebsiteContent(page: NotionContent): boolean {
  const type = page.properties?.Type?.select?.name;
  return (type === "Content" || type === "Edition")
    && page.properties?.Status?.select?.name === "Published"
    && !!page.properties?.Channels?.multi_select?.some((channel) => channel.name === "Website");
}

function toPublicPost(page: NotionContent): WritingPost | null {
  const title = page.properties?.Title?.title?.map((part) => part.plain_text ?? "").join("") ?? "";
  const summary = page.properties?.Summary?.rich_text?.map((part) => part.plain_text ?? "").join("") ?? "";
  const publicUrl = page.properties?.["Public URL"]?.url ?? "";
  const date = page.properties?.["Publish date"]?.date?.start ?? "";

  // A published item must link to a real public destination. No draft/Notion
  // page body or guessed /notes route is exposed through this metadata feed.
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

function notionHeaders(env: Env) {
  return {
    Authorization: `Bearer ${env.NOTION_TOKEN}`,
    "Content-Type": "application/json",
    "Notion-Version": "2025-09-03",
  };
}
