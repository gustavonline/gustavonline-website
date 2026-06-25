import type { WritingPost } from "../../shared/contracts/content";
import type { Env } from "../types";

type NotionPaper = {
  properties?: {
    Title?: { title?: Array<{ plain_text?: string }> };
    Summary?: { rich_text?: Array<{ plain_text?: string }> };
    Slug?: { rich_text?: Array<{ plain_text?: string }> };
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
          property: "Status",
          select: {
            equals: "Published",
          },
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
    return [];
  }

  const data = (await notionResponse.json()) as { results?: NotionPaper[] };
  return (data.results ?? []).map((page) => toPublicPost(page, env)).filter((post) => post.title);
}

function toPublicPost(page: NotionPaper, env: Env): WritingPost {
  const title = page.properties?.Title?.title?.map((part) => part.plain_text ?? "").join("") ?? "";
  const summary = page.properties?.Summary?.rich_text?.map((part) => part.plain_text ?? "").join("") ?? "";
  const slug = page.properties?.Slug?.rich_text?.map((part) => part.plain_text ?? "").join("") ?? "";
  const publicUrl = page.properties?.["Public URL"]?.url ?? "";
  const date = page.properties?.["Publish date"]?.date?.start ?? "";

  return {
    title,
    summary,
    date,
    url: publicUrl || `${env.PUBLIC_SITE_URL}/notes/${slug}`,
  };
}

function notionHeaders(env: Env) {
  return {
    Authorization: `Bearer ${env.NOTION_TOKEN}`,
    "Content-Type": "application/json",
    "Notion-Version": "2025-09-03",
  };
}
