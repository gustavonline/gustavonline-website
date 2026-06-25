import type { Env } from "./types";

const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
};

export function json(body: unknown, status: number, request: Request, env: Env) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...jsonHeaders,
      ...corsHeaders(request, env),
    },
  });
}

export function corsHeaders(request: Request, env: Env) {
  const origin = request.headers.get("Origin");
  const allowedOrigins = env.ALLOWED_ORIGINS.split(",").map((allowedOrigin) => allowedOrigin.trim());
  const allowedOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
