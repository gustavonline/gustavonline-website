import { json } from "../http";
import type { Env } from "../types";
import { allowsDashboardWrite, authorizeDashboard } from "./auth";
import { DashboardDataError, DashboardInputError, mondayFromForm, seedDashboard, type Dashboard } from "./model";
import { renderDashboard } from "./render";

const storeName = "content-kpis";

export async function handleDashboardRequest(request: Request, env: Env): Promise<Response> {
  if (!await authorizeDashboard(request, env)) return json({ error: "Not found" }, 404, request, env);

  const path = new URL(request.url).pathname.replace(/\/+$/, "") || "/";
  if (path === "/dashboard") return handlePage(request, env);
  if (path === "/content-kpis" || path === "/dashboard/metrics") return handleMetrics(request, env);
  return json({ error: "Not found" }, 404, request, env);
}

async function handlePage(request: Request, env: Env): Promise<Response> {
  if (request.method === "GET" || request.method === "HEAD") {
    try {
      const saved = new URL(request.url).searchParams.get("saved") === "1";
      return page(await readDashboard(env), request, { saved });
    } catch {
      return privateJson({ error: "Dashboard data cannot be read." }, 500);
    }
  }
  if (request.method !== "POST") return privateJson({ error: "Method not allowed" }, 405);
  if (!allowsDashboardWrite(request)) return privateJson({ error: "Could not save." }, 403);
  return writeMonday(request, env);
}

async function handleMetrics(request: Request, env: Env): Promise<Response> {
  if (request.method === "GET" || request.method === "HEAD") {
    try {
      const body = JSON.stringify(await readDashboard(env));
      return privateJson(request.method === "HEAD" ? null : body, 200, true);
    } catch {
      return privateJson({ error: "Dashboard data cannot be read." }, 500);
    }
  }
  if (request.method !== "POST") return privateJson({ error: "Method not allowed" }, 405);
  if (!allowsDashboardWrite(request)) return privateJson({ error: "Could not save." }, 403);
  let payload: unknown;
  try {
    payload = await readJson(request);
  } catch (error) {
    return privateJson({ error: error instanceof DashboardInputError ? error.message : "Invalid JSON." }, 400);
  }
  const result = await postStore(env, "/metrics", payload);
  if (!result.ok) return privateJson({ error: result.error }, result.status);
  return privateJson({ ok: true }, 200);
}

async function writeMonday(request: Request, env: Env): Promise<Response> {
  const wantsHtml = (request.headers.get("Content-Type") ?? "").includes("application/x-www-form-urlencoded");
  let payload: unknown;
  try {
    payload = wantsHtml ? mondayFromForm(new URLSearchParams(await readText(request))) : await readJson(request);
  } catch (error) {
    const message = error instanceof DashboardInputError ? error.message : "Invalid JSON.";
    return wantsHtml ? page(await readOrSeed(env), request, { error: message }, 400) : privateJson({ error: message }, 400);
  }
  const result = await postStore(env, "/monday", payload);
  if (!result.ok) {
    return wantsHtml ? page(await readOrSeed(env), request, { error: result.error }, result.status) : privateJson({ error: result.error }, result.status);
  }
  if (wantsHtml) return Response.redirect(new URL("/dashboard?saved=1", request.url), 303);
  return privateJson({ ok: true }, 200);
}

async function readDashboard(env: Env): Promise<Dashboard> {
  const namespace = env.CONTENT_DASHBOARD;
  if (!namespace) return seedDashboard();
  const response = await namespace.get(namespace.idFromName(storeName)).fetch("https://dashboard.internal/document");
  if (!response.ok) throw new DashboardDataError("Dashboard data cannot be read.");
  return response.json() as Promise<Dashboard>;
}

async function readOrSeed(env: Env): Promise<Dashboard> {
  try {
    return await readDashboard(env);
  } catch {
    return seedDashboard();
  }
}

async function postStore(env: Env, pathname: string, payload: unknown): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const namespace = env.CONTENT_DASHBOARD;
  if (!namespace) return { ok: false, status: 503, error: "Dashboard storage is not configured." };
  let response: Response;
  try {
    response = await namespace.get(namespace.idFromName(storeName)).fetch(`https://dashboard.internal${pathname}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch {
    console.error("dashboard_store_failed");
    return { ok: false, status: 503, error: "Dashboard storage is not configured." };
  }
  if (response.ok) return { ok: true };
  const body = await response.json().catch(() => null) as { error?: unknown } | null;
  const error = typeof body?.error === "string" ? body.error : "Could not save.";
  return { ok: false, status: response.status === 400 ? 400 : 500, error };
}

async function readText(request: Request): Promise<string> {
  const declared = Number(request.headers.get("Content-Length") ?? "0");
  if (Number.isFinite(declared) && declared > 32_000) throw new DashboardInputError("Request is too large.");
  const text = await request.text();
  if (text.length > 32_000) throw new DashboardInputError("Request is too large.");
  return text;
}

async function readJson(request: Request): Promise<unknown> {
  const text = await readText(request);
  try {
    return JSON.parse(text);
  } catch {
    throw new DashboardInputError("Invalid JSON.");
  }
}

function page(doc: Dashboard, request: Request, options: { saved?: boolean; error?: string | null }, status = 200): Response {
  const html = renderDashboard(doc, options);
  return new Response(request.method === "HEAD" ? null : html, { status, headers: pageHeaders });
}

function privateJson(body: unknown, status: number, raw = false): Response {
  return new Response(body === null ? null : raw && typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-store",
      "CDN-Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}

const pageHeaders = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "private, no-store",
  "CDN-Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; font-src data:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
};
