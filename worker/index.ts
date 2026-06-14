/// <reference types="@cloudflare/workers-types" />

type Env = {
  ALLOWED_ORIGIN: string;
  KIT_API_KEY: string;
  NOTION_TOKEN: string;
  NOTION_PAPERS_DATA_SOURCE_ID: string;
  PUBLIC_SITE_URL: string;
};

type NewsletterRequest = {
  email?: unknown;
  source?: unknown;
};

type NotionPaper = {
  properties?: {
    Title?: { title?: Array<{ plain_text?: string }> };
    Summary?: { rich_text?: Array<{ plain_text?: string }> };
    Slug?: { rich_text?: Array<{ plain_text?: string }> };
    "Public URL"?: { url?: string | null };
    "Publish date"?: { date?: { start?: string } | null };
  };
};

const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(request, env) });
    }

    const url = new URL(request.url);

    if (url.pathname === "/newsletter" && request.method === "POST") {
      return handleNewsletterSignup(request, env);
    }

    if (url.pathname === "/posts" && request.method === "GET") {
      return handlePosts(request, env);
    }

    return json({ error: "Not found" }, 404, request, env);
  },
};

async function handleNewsletterSignup(request: Request, env: Env) {
  const payload = (await request.json().catch(() => null)) as NewsletterRequest | null;
  const email = typeof payload?.email === "string" ? payload.email.trim().toLowerCase() : "";
  const source = typeof payload?.source === "string" ? payload.source.trim() : "gustavonline";

  if (!isValidEmail(email)) {
    return json({ error: "Invalid email" }, 400, request, env);
  }

  await upsertKitSubscriber(email, source, env);

  return json({ ok: true }, 200, request, env);
}

async function handlePosts(request: Request, env: Env) {
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
    return json({ posts: [] }, 200, request, env);
  }

  const data = (await notionResponse.json()) as { results?: NotionPaper[] };
  const posts = (data.results ?? []).map((page) => toPublicPost(page, env)).filter((post) => post.title);

  return json({ posts }, 200, request, env);
}

async function upsertKitSubscriber(email: string, source: string, env: Env) {
  const response = await fetch("https://api.kit.com/v4/subscribers", {
    method: "POST",
    headers: {
      "X-Kit-Api-Key": env.KIT_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email_address: email,
      state: "active",
      fields: {
        source,
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Kit subscriber upsert failed: ${response.status} ${text}`);
  }

  const data = (await response.json()) as { subscriber?: { id?: number }; id?: number };
  return data.subscriber ?? data;
}

function toPublicPost(page: NotionPaper, env: Env) {
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

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function json(body: unknown, status: number, request: Request, env: Env) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...jsonHeaders,
      ...corsHeaders(request, env),
    },
  });
}

function corsHeaders(request: Request, env: Env) {
  const origin = request.headers.get("Origin");
  const allowedOrigin = origin && origin === env.ALLOWED_ORIGIN ? origin : env.ALLOWED_ORIGIN;

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
