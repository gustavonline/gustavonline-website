/// <reference types="@cloudflare/workers-types" />

import {
  normalizeNewsletterSignupPayload,
  type NewsletterSignupResponse,
} from "../shared/contracts/content";
import { getPublicIssue, isPublicNewsletter, listPublishedPosts, newsletterFilter, queryContent } from "./adapters/notion";
import { issueResponseHeaders, renderIssue } from "./newsletter-renderer";
import { upsertKitSubscriber } from "./adapters/kit";
import { corsHeaders, json } from "./http";
import type { Env } from "./types";
export { NewsletterDrafts } from "./newsletter-drafts";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(request, env) });
    }

    const url = new URL(request.url);

    if ((request.method === "GET" || request.method === "HEAD") && url.pathname.startsWith("/notes/")) {
      const unavailable = (message: string, status: number) => new Response(request.method === "HEAD" ? null : message, {
        status, headers: { ...issueResponseHeaders, "Content-Type": "text/plain; charset=utf-8" },
      });
      try {
        const slug = url.pathname.slice(7).replace(/\/$/, "");
        const issue = await getPublicIssue(slug, env);
        if (!issue) return unavailable("Issue not found", 404);
        const html = renderIssue(issue, env.PUBLIC_SITE_URL);
        return new Response(request.method === "HEAD" ? null : html, { headers: issueResponseHeaders });
      } catch { return unavailable("This issue is temporarily unavailable. Please try again.", 502); }
    }

    if (url.pathname === "/newsletter" && request.method === "POST") {
      return handleNewsletterSignup(request, env);
    }

    if (url.pathname === "/posts" && request.method === "GET") {
      return handlePosts(request, env);
    }

    return json({ error: "Not found" }, 404, request, env);
  },

  async scheduled(_event: ScheduledController, env: Env): Promise<void> {
    if (!env.NEWSLETTER_DRAFTS) throw new Error("Newsletter draft ledger is not configured");
    const pages = await queryContent(env, { and: [
      // Publiceret is a public archive alias only. Preserve the existing
      // mail job selection rather than enrolling more editions in Kit.
      { property: "Status", select: { equals: "Published" } },
      ...newsletterFilter.and.slice(1),
      { property: "Send as newsletter", checkbox: { equals: true } },
      { property: "Kit broadcast id", rich_text: { is_empty: true } },
    ] });
    let failed = false;
    for (const page of pages) {
      if (!page.id || !isPublicNewsletter(page, env)) continue;
      try {
        const stub = env.NEWSLETTER_DRAFTS.get(env.NEWSLETTER_DRAFTS.idFromName(page.id));
        const response = await stub.fetch(`https://draft.internal/${page.id}`, { method: "POST" });
        if (!response.ok) failed = true;
      } catch {
        console.error("newsletter_draft_transport_failed", { pageId: page.id });
        failed = true;
      }
    }
    if (failed) throw new Error("Newsletter draft preparation needs attention");
  },
};

async function handleNewsletterSignup(request: Request, env: Env) {
  const payload = await request.json().catch(() => null);
  const result = normalizeNewsletterSignupPayload(payload, "gustavonline");

  if (!result.ok) {
    return json({ error: result.error }, 400, request, env);
  }

  try {
    await upsertKitSubscriber(result.value.email, result.value.source, env);
  } catch {
    return json(
      { error: "Newsletter signup is temporarily unavailable. Please try again." },
      502,
      request,
      env,
    );
  }

  return json(
    { ok: true } satisfies NewsletterSignupResponse,
    200,
    request,
    env,
  );
}

async function handlePosts(request: Request, env: Env) {
  try {
    const posts = await listPublishedPosts(env, new URL(request.url).searchParams.get("format") === "newsletter");
    return json({ posts }, 200, request, env);
  } catch {
    return json(
      { error: "Posts are temporarily unavailable. Please try again." },
      502,
      request,
      env,
    );
  }
}
