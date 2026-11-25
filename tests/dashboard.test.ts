import { readFileSync } from "node:fs";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearAccessKeyCache } from "../worker/dashboard/auth";
import { formatCompact, formatExact, formatValue, mondayOf, todayIn, weekMonday } from "../worker/dashboard/format";
import { isoWeek, parseDashboard, seedDashboard } from "../worker/dashboard/model";
import { summarize } from "../worker/dashboard/summary";
import worker, { ContentDashboard } from "../worker/index";
import type { Env } from "../worker/types";
import danishDocument from "./fixtures/content-kpis-danish.json";

const token = "test-dashboard-token";

// Wednesday in ISO week 48, so the Monday review covers 16–22 November.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-11-25T12:00:00Z") });
});

afterEach(() => {
  vi.useRealTimers();
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
    expect(body).not.toContain("17,119");
  });

  it("renders the counted seed and both theme tokens for Gustav", async () => {
    const response = await worker.fetch(authed("/dashboard"), makeEnv());
    expect(response.status).toBe(200);
    expect(response.headers.get("X-Robots-Tag")).toContain("noindex");
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    const html = await response.text();
    expect(html).toContain('<meta name="robots" content="noindex, nofollow, noarchive" />');
    expect(html).toContain("Content dashboard");
    expect(html).toContain('<html lang="en">');
    const x = part(html, "platform", "x");
    expect(x).toContain(">60<");
    expect(x).toContain("+16 (+36%)");
    expect(x).toContain("As of 24 Nov");
    expect(x).toContain('title="17,119">17.1K<');
    expect(x).toContain("Week of 16 Nov");
    const details = part(html, "details", "x");
    for (const label of ["Views / impressions", "Likes", "Replies", "Reposts", "Bookmarks", "Bookmarks per 100 likes"]) expect(details).toContain(label);
    for (const value of [">80<", ">17<", ">55<", ">68.8<"]) expect(details).toContain(value);
    expect(details).toContain("partial week");
    expect(html).toContain("+23 since 21 Nov 2026 (37)");
    expect(html).toContain("prefers-color-scheme: dark");
    expect(html).toContain("gustavonline-theme");
    expect(html).toContain("--bg:#f5f6f5");
    expect(html).toContain("--bg:#20201d");
    expect(html).toContain("--brand-orange:#ee7f3c");
    expect(html).not.toContain("/newsletter");
  });

  it("shows one headline card per platform, with No data yet instead of fill-in boxes", async () => {
    const html = await (await worker.fetch(authed("/dashboard"), makeEnv())).text();
    const labels = {
      x: ["X", "Followers", "Views / impressions"],
      linkedin: ["LinkedIn", "Followers", "Impressions"],
      youtube: ["YouTube", "Subscribers", "Views"],
      newsletter: ["Newsletter (Kit)", "Subscribers"],
    };
    expect([...html.matchAll(/data-platform="(\w+)"/g)].map((match) => match[1])).toEqual(Object.keys(labels));
    for (const [platform, expected] of Object.entries(labels)) {
      const card = part(html, "platform", platform);
      for (const label of expected) expect(card).toContain(`>${label}<`);
      if (platform === "x") continue;
      expect(card.match(/No data yet/g)).toHaveLength(expected.length - 1);
      expect(part(html, "details", platform)).toContain("No data yet");
    }
    expect(html).not.toMatch(/<(form|input|textarea|select)\b/);
  });

  it("keeps Danish out of the page, also for documents saved before it was English", async () => {
    for (const stored of [undefined, danishDocument]) {
      const env = makeEnv({ CONTENT_DASHBOARD: memoryDashboard(stored) as unknown as Env["CONTENT_DASHBOARD"] });
      const html = await (await worker.fetch(authed("/dashboard"), env)).text();
      const text = html.replace(/<(style|script)>[\s\S]*?<\/\1>/g, "");
      expect(text).toContain("17.1K");
      expect(text).toContain("+23 since 21 Nov 2026 (37)");
      expect(text).toContain("partial week");
      expect(text).not.toMatch(/[æøå]/i);
      expect(text).not.toMatch(/\b(uge|udfyldes|lukket|følgere|visninger|svar|abonnenter|mandag|mandagslog|aften|ikke|tal|gemt|nov\.)/i);
    }
  });

  it("reviews the previous Monday to Sunday week, in Copenhagen time", async () => {
    const heading = async () => /<h2 id="review">(.*?)<\/h2>\s*<p class="sub">(.*?)<\/p>/.exec(await (await worker.fetch(authed("/dashboard"), makeEnv())).text())?.slice(1);
    expect(await heading()).toEqual(["Monday review — week of 16 November 2026", "Mon 16 Nov – Sun 22 Nov 2026 · week 47 · partial week"]);
    // Sunday 23:30 in Copenhagen still belongs to the running week.
    vi.setSystemTime(new Date("2026-11-29T22:30:00Z"));
    expect((await heading())?.[0]).toBe("Monday review — week of 16 November 2026");
    vi.setSystemTime(new Date("2026-11-29T23:30:00Z"));
    expect(await heading()).toEqual(["Monday review — week of 23 November 2026", "Mon 23 Nov – Sun 29 Nov 2026 · week 48"]);
    vi.setSystemTime(new Date("2027-01-04T09:00:00Z"));
    expect(await heading()).toEqual(["Monday review — week of 28 December 2026", "Mon 28 Dec – Sun 3 Jan 2027 · week 53"]);
  });

  it("compares only full weeks that follow each other", async () => {
    const env = makeEnv();
    const post = async (body: unknown) => expect((await worker.fetch(authed("/content-kpis", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    }), env)).status).toBe(200);
    const summary = async () => summarize(await (await worker.fetch(authed("/content-kpis"), env)).json() as ReturnType<typeof seedDashboard>, new Date());
    const impressions = async () => (await summary()).cards[0].readings[1];
    await post({ year: 2026, week: 46, x: { followers: 31, impressions: 12000 }, linkedin: { impressions: 900 } });
    // Week 47 is marked partial in the seed, so its total has no comparison. Its follower count does.
    expect(await impressions()).toMatchObject({ value: 17119, delta: null, period: "Week of 16 Nov" });
    expect((await summary()).review.platforms[0].rows?.[0]).toMatchObject({ value: 44, previous: 31, delta: { amount: 13, percent: 42 } });
    await post({ year: 2026, week: 47, partial: false });
    expect(await impressions()).toMatchObject({ value: 17119, delta: { amount: 5119, percent: 43 } });
    // A running week is shown as such and never compared.
    await post({ year: 2026, week: 48, x: { impressions: 300 }, linkedin: { impressions: 1000 } });
    expect(await impressions()).toMatchObject({ value: 300, delta: null, period: "This week so far" });
    // LinkedIn has weeks 46 and 48 only: no previous week to compare with, even once 48 is over.
    vi.setSystemTime(new Date("2026-11-30T09:00:00Z"));
    expect((await summary()).cards[1].readings[1]).toMatchObject({ value: 1000, delta: null, period: "Week of 23 Nov" });
    // A week that has not started cannot be the latest one.
    await post({ year: 2026, week: 52, x: { impressions: 9 } });
    expect(await impressions()).toMatchObject({ value: 300 });
  });

  it("prefers a finished week's X count over a snapshot from inside that week", () => {
    const doc = seedDashboard();
    const week = doc.weeks.find((item) => item.week === 48);
    if (!week) throw new Error("missing week");
    week.x = { followers: 75, impressions: null, impressionsNote: null, likes: null, replies: null, reposts: null, bookmarks: null };
    const followers = (now: string) => summarize(doc, new Date(now)).cards[0].readings[0];
    expect(followers("2026-11-25T12:00:00Z")).toMatchObject({ value: 60, period: "As of 24 Nov" });
    expect(followers("2026-11-30T09:00:00Z")).toMatchObject({ value: 75, period: "Week of 23 Nov", delta: { amount: 31 } });
  });

  it("stores and shows every detail metric from the assistant", async () => {
    const env = makeEnv();
    const saved = await worker.fetch(authed("/content-kpis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        year: 2026, week: 47,
        x: { reposts: 9 },
        linkedin: { impressions: 10234, reactions: 121, comments: 11, reposts: 3 },
        youtube: { views: 1873, watchTimeHours: 70.2, likes: 52, comments: 0, subscribersGained: 8 },
        newsletter: { subscribers: 156, openRatePercent: 50.3, clickRatePercent: 6.4 },
        goals: { newsletterSubscribers: 200 },
      }),
    }), env);
    expect(saved.status).toBe(200);
    const html = await (await worker.fetch(authed("/dashboard"), env)).text();
    expect(metrics(part(html, "details", "x"))).toMatchObject({ Reposts: "9" });
    expect(metrics(part(html, "details", "linkedin"))).toEqual({ Impressions: "10.2K", Reactions: "121", Comments: "11", Reposts: "3" });
    expect(metrics(part(html, "details", "youtube"))).toEqual({ Views: "1.9K", "Watch time": "70.2 h", Likes: "52", Comments: "0", "Subscribers gained": "8" });
    expect(metrics(part(html, "details", "newsletter"))).toEqual({ Subscribers: "156", "Open rate": "50.3%", "Click rate": "6.4%", Opens: "No data yet", Clicks: "No data yet" });
    expect(part(html, "platform", "newsletter")).toContain("78% of goal");
    for (const body of [{ week: 47, x: { reposts: -1 } }, { week: 47, newsletter: { clickRatePercent: 101 } }, { week: 47, partial: "yes" }, { week: 47, linkedin: { shares: 1 } }]) {
      const rejected = await worker.fetch(authed("/content-kpis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }), env);
      expect(rejected.status).toBe(400);
    }
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
    expect(html).toContain("17,119");
    expect(html).toContain(">60<");
    for (const platform of ["linkedin", "youtube"]) expect(part(html, "platform", platform).match(/No data yet/g)).toHaveLength(1);
    expect(part(html, "platform", "newsletter")).not.toContain("No data yet");
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
    expect(part(html, "platform", "x")).toContain(">60<");
    expect(part(html, "platform", "x")).not.toContain(">45<");
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
    expect(part(html, "platform", "x")).toContain(">This week<");
    expect(html).toContain("17,119");
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
    expect(html).toContain("Week saved.");
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
    expect(metrics(part(html, "details", "linkedin"))).toMatchObject({ Impressions: "340" });
    const data = await (await worker.fetch(authed("/content-kpis"), env)).json() as { weeks: Array<{ week: number; linkedin: { followers: number; impressions: number } | null }> };
    expect(data.weeks.find((week) => week.week === 48)?.linkedin).toEqual({ followers: 12, impressions: 340, reactions: null, comments: null, reposts: null });
  });

  it("never renders assistant text and rejects unknown or empty Monday input", async () => {
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
    expect(await empty.json()).toEqual({ error: "Send at least one number." });
    const poisoned = await worker.fetch(authed("/content-kpis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ xSeries: [{ followers: 60, axisLabel: "<script>alert(1)</script>" }] }),
    }), env);
    expect(poisoned.status).toBe(200);
    const html = await (await worker.fetch(authed("/dashboard"), env)).text();
    expect(html).not.toContain("alert(1)");
  });

  it("serves the seed when the store is not configured and refuses to pretend a write succeeded", async () => {
    const env = makeEnv({ CONTENT_DASHBOARD: undefined });
    const page = await worker.fetch(authed("/dashboard"), env);
    expect(page.status).toBe(200);
    expect(await page.text()).toContain("17,119");
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
    expect(await rejected.text()).not.toContain("17,119");
  });

  it("rejects Access tokens that are expired, for another app, from another team or signed by another key", async () => {
    const { publicJwk, privateKey } = await keyPair();
    const other = await keyPair();
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response(JSON.stringify({ keys: [publicJwk] })));
    const env = makeEnv({ DASHBOARD_TOKEN: undefined, CF_ACCESS_TEAM_DOMAIN: "gustav.cloudflareaccess.com", CF_ACCESS_AUD: "aud-tag" });
    const now = Math.floor(Date.now() / 1000);
    const tokens = [
      await signJwt(privateKey, publicJwk.kid, accessClaims({ exp: now - 120 })),
      await signJwt(privateKey, publicJwk.kid, accessClaims({ aud: "another-app" })),
      await signJwt(privateKey, publicJwk.kid, accessClaims({ iss: "https://evil.cloudflareaccess.com" })),
      await signJwt(other.privateKey, publicJwk.kid, accessClaims()),
    ];
    for (const jwt of tokens) {
      for (const path of ["/dashboard", "/dashboard/", "/dashboard/metrics", "/content-kpis"]) {
        const response = await worker.fetch(new Request(`https://api.example.com${path}`, { headers: { "Cf-Access-Jwt-Assertion": jwt } }), env);
        expect(response.status).toBe(404);
        expect(await response.text()).toBe('{"error":"Not found"}');
      }
    }
  });

  it("answers /content-kpis with 404 until the bearer token matches", async () => {
    const env = makeEnv();
    const response = await worker.fetch(authed("/content-kpis"), env);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(parseDashboard(await response.json())).toEqual(seedDashboard());
    for (const value of ["", "Bearer", "Bearer ", `Bearer ${token}x`, token]) {
      expect((await worker.fetch(authed("/content-kpis", { headers: { Authorization: value || " " } }), env)).status).toBe(404);
    }
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

  it("does week math across years and daylight saving time", () => {
    expect(weekMonday(2026, 47)).toBe("2026-11-16");
    expect(weekMonday(2026, 53)).toBe("2026-12-28");
    expect(weekMonday(2027, 1)).toBe("2027-01-04");
    expect(mondayOf("2026-11-22")).toBe("2026-11-16");
    expect(mondayOf("2026-03-29")).toBe("2026-03-23");
    expect(todayIn("Europe/Copenhagen", new Date("2026-06-30T22:30:00Z"))).toBe("2026-07-01");
    expect(todayIn("not a zone", new Date("2026-11-29T23:30:00Z"))).toBe("2026-11-30");
  });

  it("formats numbers one way everywhere", () => {
    expect([0, 999, 1000, 1234, 12450, 17119, 999_949, 999_950, 1_500_000, 2_000_000_000].map(formatCompact))
      .toEqual(["0", "999", "1K", "1.2K", "12.5K", "17.1K", "999.9K", "1M", "1.5M", "2B"]);
    expect(formatCompact(-1234)).toBe("−1.2K");
    expect(formatCompact(999.96)).toBe("1K");
    expect(formatValue(70.25, "hours")).toBe("70.3 h");
    expect(formatValue(48, "percent")).toBe("48%");
    expect(formatExact(17119, "count")).toBe("17,119");
    expect(formatExact(1200.5, "hours")).toBe("1,200.5 hours");
    expect(formatExact(100, "percent")).toBe("100%");
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

function memoryDashboard(stored?: unknown) {
  const map = new Map<string, unknown>(stored ? [["document", JSON.stringify(stored)]] : []);
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

function part(html: string, attribute: string, name: string): string {
  return new RegExp(`<article class="card" data-${attribute}="${name}">[\\s\\S]*?</article>`).exec(html)?.[0] ?? "";
}

function metrics(panel: string): Record<string, string> {
  return Object.fromEntries([...panel.matchAll(/<dt>([^<]*?)<\/dt><dd>(?:<span class="change[^>]*>[^<]*<\/span>)?(?:<b>)?<span[^>]*>([^<]*)</g)].map((match) => [match[1], match[2]]));
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
