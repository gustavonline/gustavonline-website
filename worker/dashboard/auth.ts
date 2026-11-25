import type { Env } from "../types";

const teamDomainPattern = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+cloudflareaccess\.com$/;
const keyCache = new Map<string, { expires: number; keys: Map<string, JsonWebKey> }>();

export function clearAccessKeyCache() {
  keyCache.clear();
}

export async function authorizeDashboard(request: Request, env: Env): Promise<boolean> {
  if (bearerMatches(request, env.DASHBOARD_TOKEN)) return true;
  return accessJwtMatches(request, env);
}

export function allowsDashboardWrite(request: Request): boolean {
  const site = request.headers.get("Sec-Fetch-Site");
  if (site === "cross-site" || site === "same-site") return false;
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) return false;
  const bearer = request.headers.get("Authorization")?.startsWith("Bearer ") ?? false;
  if (!bearer && !origin && site !== "same-origin" && site !== "none") return false;
  return true;
}

function bearerMatches(request: Request, configured: string | undefined): boolean {
  const expected = configured?.trim() ?? "";
  if (!expected) return false;
  const header = request.headers.get("Authorization") ?? "";
  const prefix = "Bearer ";
  if (!header.startsWith(prefix)) return false;
  return safeEqual(header.slice(prefix.length), expected);
}

function safeEqual(left: string, right: string): boolean {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  const length = Math.max(a.length, b.length);
  let mismatch = a.length === b.length ? 0 : 1;
  for (let index = 0; index < length; index += 1) mismatch |= (a[index] ?? 0) ^ (b[index] ?? 0);
  return mismatch === 0;
}

async function accessJwtMatches(request: Request, env: Env): Promise<boolean> {
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  const team = env.CF_ACCESS_TEAM_DOMAIN?.trim().toLowerCase() ?? "";
  const audience = env.CF_ACCESS_AUD?.trim() ?? "";
  if (!token || !team || !audience || !teamDomainPattern.test(team)) return false;
  const email = (env.DASHBOARD_ACCESS_EMAIL?.trim() || "hello@gustavonline.com").toLowerCase();
  try {
    const payload = await verifyAccessJwt(token, team);
    if (!payload) return false;
    if (payload.iss !== `https://${team}`) return false;
    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!audiences.includes(audience)) return false;
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== "number" || payload.exp < now - 60) return false;
    if (typeof payload.nbf === "number" && payload.nbf > now + 60) return false;
    return typeof payload.email === "string" && payload.email.toLowerCase() === email;
  } catch {
    return false;
  }
}

interface AccessPayload {
  iss?: unknown;
  aud?: unknown;
  exp?: unknown;
  nbf?: unknown;
  email?: unknown;
}

async function verifyAccessJwt(token: string, team: string): Promise<AccessPayload | null> {
  if (token.length > 8000) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const header = decodeJson(parts[0]);
  if (!header || header.alg !== "RS256" || typeof header.kid !== "string" || header.jwk) return null;
  const jwk = (await accessKeys(team)).get(header.kid);
  if (!jwk) return null;
  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    decodeBytes(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
  );
  if (!valid) return null;
  const payload = decodeJson(parts[1]);
  if (!payload) return null;
  return payload as AccessPayload;
}

async function accessKeys(team: string): Promise<Map<string, JsonWebKey>> {
  const cached = keyCache.get(team);
  if (cached && cached.expires > Date.now()) return cached.keys;
  const response = await fetch(`https://${team}/cdn-cgi/access/certs`, {
    redirect: "manual",
    signal: AbortSignal.timeout(5000),
  });
  if (response.status !== 200) throw new Error("access certs unavailable");
  const body = await response.json() as { keys?: JsonWebKey[] };
  const keys = new Map<string, JsonWebKey>();
  for (const key of body.keys ?? []) {
    const kid = "kid" in key && typeof key.kid === "string" ? key.kid : "";
    if (key.kty !== "RSA" || typeof key.n !== "string" || typeof key.e !== "string" || !kid) continue;
    if (key.alg && key.alg !== "RS256") continue;
    keys.set(kid, { kty: "RSA", n: key.n, e: key.e, alg: "RS256", ext: true });
  }
  if (keys.size === 0) throw new Error("access certs empty");
  keyCache.set(team, { expires: Date.now() + 10 * 60 * 1000, keys });
  return keys;
}

function decodeJson(segment: string): Record<string, unknown> | null {
  try {
    const value = JSON.parse(new TextDecoder().decode(decodeBytes(segment))) as unknown;
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
  } catch {
    return null;
  }
}

function decodeBytes(segment: string): Uint8Array<ArrayBuffer> {
  const padded = segment.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - (segment.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}
