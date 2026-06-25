/// <reference types="@cloudflare/workers-types" />

import { normalizeNewsletterSignupPayload, type NewsletterSignupResponse } from "../shared/contracts/content";
import { listPublishedPosts } from "./adapters/notion";
import { upsertKitSubscriber } from "./adapters/kit";
import { corsHeaders, json } from "./http";
import type { Env } from "./types";

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
  const payload = await request.json().catch(() => null);
  const result = normalizeNewsletterSignupPayload(payload, "gustavonline");

  if (!result.ok) {
    return json({ error: result.error }, 400, request, env);
  }

  await upsertKitSubscriber(result.value.email, result.value.source, env);

  return json({ ok: true } satisfies NewsletterSignupResponse, 200, request, env);
}

async function handlePosts(request: Request, env: Env) {
  const posts = await listPublishedPosts(env);
  return json({ posts }, 200, request, env);
}
