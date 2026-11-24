import { readFileSync } from "node:fs";

import { afterEach, describe, expect, it, vi } from "vitest";

import { clearAccessKeyCache } from "../worker/dashboard/auth";
import { isoWeek } from "../worker/dashboard/model";
import worker, { ContentDashboard } from "../worker/index";
import type { Env } from "../worker/types";

const token = "test-dashboard-token";

afterEach(() => {
  clearAccessKeyCache();
  vi.restoreAllMocks();
});

describe("private content dashboard", () => {
  it("uses the same 404 as any other unknown path when no credential is present", async () => {
    const env = makeEnv();
    const missing = await worker.fetch(new Request("https://api.example.com/no-such-page"), env);
    const dashboard = await worker.fetch(new Request("https://api.example.com/dashboard"), env);
    const post = await worker.fetch(new Request("https://api.example.com/dashboard", { method: "POST", body: "{}" }), env);
    const metrics = await worker.fetch(new Request("https://api.example.com/content-kpis"), env);
    expect(dashboard.status).toBe(404);
    expect(post.status).toBe(404);
    expect(metrics.status).toBe(404);
    expect(await dashboard.text()).toBe(await missing.text());
    expect(await post.text()).toBe('{"error":"Not found"}');
  });

  it("does not render the KPI page for a wrong token", async () => {
    const response = await worker.fetch(new Request("https://api.example.com/dashboard", {
      headers: { Authorization: "Bearer wrong-token" },
    }), makeEnv());
    const body = await response.text();
    expect(response.status).toBe(404);
    expect(body).not.toContain("Content dashboard");
    expect(body).not.toContain("17.119");
    expect(body).not.toContain("Udfyldes");
  });

  it("renders the counted seed and both theme tokens for Gustav", async () => {
    const response = await worker.fetch(authed("/dashboard"), makeEnv());
    expect(response.status).toBe(200);
    expect(response.headers.get("X-Robots-Tag")).toContain("noindex");
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    const html = await response.text();
    expect(html).toContain('<meta name="robots" content="noindex, nofollow, noarchive" />');
    expect(html).toContain("Content dashboard");
    expect(html).toContain(">60<");
    expect(html).toContain("17.119");
    expect(html).toContain(">80<");
    expect(html).toContain(">17<");
    expect(html).toContain(">55<");
    expect(html).toContain("68,8 pr. 100 likes");
    expect(html).toContain("+23 siden baseline 21. nov. (37)");
    expect(html).toContain("+62 % på tre dage. Intet følgermål er sat endnu — feltet nedenfor er til mandagsvideoen.");
    expect(html).toContain("X klar · LI, nyhedsbrev og YouTube mangler");
    expect(html).toContain("Uge 47 lukket · 16.–22. nov. 2026");
    expect(html).toContain("Uge 48 udfyldes mandag 30. nov.");
    expect(html).toContain("Tal: offentligt X-følgertal 60 målt 24. nov. 2026 aften, Europe/Copenhagen. Uge 47 i Ugetal: 44 følgere, 17.119 visninger, 80 likes, 17 svar, 55 bogmærker, periode 16.–22. nov. X følger/1k er tom, fordi X nye ikke kunne beregnes. Ingen opfundne tal.");
    expect(html.match(/class="card empty"/g)).toHaveLength(3);
    expect(html).toContain("prefers-color-scheme: dark");
    expect(html).toContain("gustavonline-theme");
    expect(html).toContain("--bg:#f5f6f5");
    expect(html).toContain("--bg:#20201d");
    expect(html).toContain("--brand-orange:#ee7f3c");
    expect(html).toContain("Følgere og ER i mandagsreviewet");
    expect(html).not.toContain("/newsletter");
  });

  it("saves the four Monday numbers and leaves assistant metrics untouched", async () => {
    const env = makeEnv();
    const saved = await worker.fetch(authed("/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://api.example.com" },
      body: JSON.stringify({ year: 2026, week: 48, linkedinFollowers: 12, newsletterSubscribers: 4, youtubeSubscribers: 8 }),
    }), env);
    expect(saved.status).toBe(200);
    expect(await saved.json()).toEqual({ ok: true });
    const html = await (await worker.fetch(authed("/dashboard"), env)).text();
    expect(html).toContain(">12<");
    expect(html).toContain(">4<");
    expect(html).toContain(">8<");
    expect(html).toContain("17.119");
    expect(html).toContain(">60<");
    expect(html).not.toContain('class="card empty"');
  });

  it("keeps an older week from replacing the newer X snapshot", async () => {
    const env = makeEnv();
    const response = await worker.fetch(authed("/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ week: 47, xFollowers: 45 }),
    }), env);
    expect(response.status).toBe(200);
    const html = await (await worker.fetch(authed("/dashboard"), env)).text();
    expect(html).toContain(">60<");
    expect(html).not.toContain(">45<");
  });

  it("moves the current X snapshot when the Monday number is for this week or later", async () => {
    const env = makeEnv();
    await worker.fetch(authed("/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ week: 48, year: 2026, xFollowers: 61 }),
    }), env);
    const html = await (await worker.fetch(authed("/dashboard"), env)).text();
    expect(html).toContain(">61<");
    expect(html).toContain("Uge 48");
    expect(html).toContain("17.119");
    expect(html).not.toContain("30. nov. 2026");
  });

  it("rejects a cross-site write even with the token", async () => {
    const env = makeEnv();
    const response = await worker.fetch(authed("/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Sec-Fetch-Site": "cross-site" },
      body: JSON.stringify({ week: 48, xFollowers: 99 }),
    }), env);
    expect(response.status).toBe(403);
    const html = await (await worker.fetch(authed("/dashboard"), env)).text();
    expect(html).toContain(">60<");
    expect(html).not.toContain(">99<");
  });

  it("accepts the Monday form post and redirects back to the page", async () => {
    const env = makeEnv();
    const response = await worker.fetch(authed("/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "week=48&year=2026&xFollowers=61",
    }), env);
    expect(response.status).toBe(303);
    expect(response.headers.get("Location")).toBe("https://api.example.com/dashboard?saved=1");
    const html = await (await worker.fetch(authed("/dashboard?saved=1"), env)).text();
    expect(html).toContain("Ugen er gemt.");
    expect(html).toContain(">61<");
  });

  it("lets the assistant add a metric without clearing the Monday number", async () => {
    const env = makeEnv();
    await worker.fetch(authed("/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ week: 48, linkedinFollowers: 12 }),
    }), env);
    const update = await worker.fetch(authed("/content-kpis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year: 2026, week: 48, linkedin: { impressions: 340 } }),
    }), env);
    expect(update.status).toBe(200);
    const html = await (await worker.fetch(authed("/dashboard"), env)).text();
    expect(html).toContain(">12<");
    expect(html).toContain("340 visninger");
    const data = await (await worker.fetch(authed("/content-kpis"), env)).json() as { weeks: Array<{ week: number; linkedin: { followers: number; impressions: number } | null }> };
    expect(data.weeks.find((week) => week.week === 48)?.linkedin).toEqual({ followers: 12, impressions: 340 });
  });

  it("escapes assistant text and rejects unknown or empty Monday input", async () => {
    const env = makeEnv();
    const unknown = await worker.fetch(authed("/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ week: 48, impressions: 5 }),
    }), env);
    expect(unknown.status).toBe(400);
    const empty = await worker.fetch(authed("/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ week: 48 }),
    }), env);
    expect(empty.status).toBe(400);
    expect(await empty.json()).toEqual({ error: "Mindst ét tal skal udfyldes." });
    const poisoned = await worker.fetch(authed("/content-kpis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ xSeries: [{ followers: 60, axisLabel: "<script>alert(1)</script>" }] }),
    }), env);
    expect(poisoned.status).toBe(200);
    const html = await (await worker.fetch(authed("/dashboard"), env)).text();
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
  });

  it("serves the seed when the store is not configured and refuses to pretend a write succeeded", async () => {
    const env = makeEnv({ CONTENT_DASHBOARD: undefined });
    const page = await worker.fetch(authed("/dashboard"), env);
    expect(page.status).toBe(200);
    expect(await page.text()).toContain("17.119");
    const write = await worker.fetch(authed("/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ week: 48, xFollowers: 61 }),
    }), env);
    expect(write.status).toBe(503);
  });

  it("accepts Gustav's Access JWT and rejects a different email", async () => {
    const { publicJwk, privateKey } = await keyPair();
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      expect(String(input)).toBe("https://gustav.cloudflareaccess.com/cdn-cgi/access/certs");
      return new Response(JSON.stringify({ keys: [publicJwk] }));
    });
    const env = makeEnv({
      DASHBOARD_TOKEN: undefined,
      CF_ACCESS_TEAM_DOMAIN: "gustav.cloudflareaccess.com",
      CF_ACCESS_AUD: "aud-tag",
    });
    const good = await signJwt(privateKey, publicJwk.kid, accessClaims());
    const allowed = await worker.fetch(new Request("https://api.example.com/dashboard", {
      headers: { "Cf-Access-Jwt-Assertion": good },
    }), env);
    expect(allowed.status).toBe(200);
    clearAccessKeyCache();
    const bad = await signJwt(privateKey, publicJwk.kid, accessClaims({ email: "other@example.com" }));
    const rejected = await worker.fetch(new Request("https://api.example.com/dashboard", {
      headers: { "Cf-Access-Jwt-Assertion": bad },
    }), env);
    expect(rejected.status).toBe(404);
    expect(await rejected.text()).not.toContain("17.119");
  });

  it("does not treat a malformed Access token as a login", async () => {
    const env = makeEnv({
      DASHBOARD_TOKEN: undefined,
      CF_ACCESS_TEAM_DOMAIN: "evil.example",
      CF_ACCESS_AUD: "aud-tag",
    });
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const response = await worker.fetch(new Request("https://api.example.com/dashboard", {
      headers: { "Cf-Access-Jwt-Assertion": "a.b.c" },
    }), env);
    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps the dashboard off the public site map and navigation", () => {
    expect(readFileSync("public/sitemap.xml", "utf8")).not.toContain("dashboard");
    expect(readFileSync("scripts/prepare-pages.mjs", "utf8")).not.toContain("dashboard");
    expect(readFileSync("src/features/landing/components/Header.tsx", "utf8")).not.toContain("/dashboard");
    expect(readFileSync("public/robots.txt", "utf8")).not.toContain("dashboard");
  });

  it("keeps 24 November 2026 in ISO week 48", () => {
    expect(isoWeek("2026-11-24")).toEqual({ year: 2026, week: 48 });
    expect(isoWeek("2026-11-22")).toEqual({ year: 2026, week: 47 });
  });
});

function makeEnv(overrides: Partial<Env> = {}): Env {
  return {
    ALLOWED_ORIGINS: "https://gustavonline.com",
    KIT_API_KEY: "unused",
    NOTION_TOKEN: "unused",
    NOTION_PAPERS_DATA_SOURCE_ID: "papers",
    PUBLIC_SITE_URL: "https://gustavonline.com",
    DASHBOARD_TOKEN: token,
    CONTENT_DASHBOARD: memoryDashboard() as unknown as Env["CONTENT_DASHBOARD"],
    ...overrides,
  };
}

function memoryDashboard() {
  const map = new Map<string, unknown>();
  const object = new ContentDashboard({
    storage: {
      get: async (key: string) => map.get(key),
      put: async (key: string, value: unknown) => { map.set(key, value); },
    },
  } as DurableObjectState, {} as Env);
  return {
    idFromName: (name: string) => name,
    get: () => ({ fetch: (input: RequestInfo | URL, init?: RequestInit) => object.fetch(new Request(input, init)) }),
  };
}

function authed(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (!headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
  return new Request(`https://api.example.com${path}`, { ...init, headers });
}

function accessClaims(overrides: Record<string, unknown> = {}) {
  const now = Math.floor(Date.now() / 1000);
  return {
    iss: "https://gustav.cloudflareaccess.com",
    aud: "aud-tag",
    exp: now + 3600,
    iat: now,
    email: "hello@gustavonline.com",
    ...overrides,
  };
}

async function keyPair() {
  const pair = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"],
  );
  const jwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  const kid = "test-key";
  return { privateKey: pair.privateKey, publicJwk: { ...jwk, kid, alg: "RS256", use: "sig" } };
}

async function signJwt(privateKey: CryptoKey, kid: string, payload: Record<string, unknown>) {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const data = `${encode({ alg: "RS256", kid, typ: "JWT" })}.${encode(payload)}`;
  const signature = await crypto.subtle.sign({ name: "RSASSA-PKCS1-v1_5" }, privateKey, new TextEncoder().encode(data));
  return `${data}.${Buffer.from(signature).toString("base64url")}`;
}
