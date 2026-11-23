import type { NewsletterSource } from "../../shared/contracts/content";
import type { Env } from "../types";

type KitBroadcast = { id: number; description?: string; status?: string; send_at?: string | null; public?: boolean };

export async function createKitDraft(subject: string, content: string, summary: string, marker: string, env: Env) {
  const response = await fetch("https://api.kit.com/v4/broadcasts", {
    method: "POST", headers: { "X-Kit-Api-Key": env.KIT_API_KEY, "Content-Type": "application/json" },
    // These are fixed here, never copied from Notion or a caller. There is no send/update API path.
    body: JSON.stringify({ subject, content, preview_text: summary, description: marker, send_at: null, public: false }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("Kit draft creation failed; reconciliation required");
  const data = await response.json() as { broadcast?: KitBroadcast };
  const broadcast = data.broadcast;
  if (!broadcast || !Number.isSafeInteger(broadcast.id) || broadcast.id <= 0 || broadcast.status !== "draft" || broadcast.send_at !== null || broadcast.public !== false)
    throw new Error("Kit draft acknowledgement invalid; reconciliation required");
  return broadcast.id;
}

export async function findKitBroadcast(marker: string, env: Env): Promise<number | undefined> {
  let cursor: string | undefined;
  let found: number | undefined;
  for (let page = 0; page < 20; page++) {
    const params = new URLSearchParams({ per_page: "100", ...(cursor ? { after: cursor } : {}) });
    const response = await fetch(`https://api.kit.com/v4/broadcasts?${params}`, {
      headers: { "X-Kit-Api-Key": env.KIT_API_KEY }, signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error("Kit draft reconciliation failed");
    const data = await response.json() as { broadcasts?: KitBroadcast[]; pagination?: { has_next_page?: boolean; end_cursor?: string } };
    if (!Array.isArray(data.broadcasts) || !data.pagination) throw new Error("Invalid Kit collection");
    for (const broadcast of data.broadcasts) {
      if (broadcast.description !== marker) continue;
      if (found || !Number.isSafeInteger(broadcast.id) || broadcast.id <= 0) throw new Error("Ambiguous Kit draft identity");
      // A human may already have sent the recovered draft. Record it; never recreate or edit it.
      found = broadcast.id;
    }
    if (!data.pagination.has_next_page) return found;
    if (!data.pagination.end_cursor || data.pagination.end_cursor === cursor) throw new Error("Invalid Kit pagination");
    cursor = data.pagination.end_cursor;
  }
  throw new Error("Kit reconciliation exceeds supported size");
}

export async function upsertKitSubscriber(
  email: string,
  source: NewsletterSource,
  env: Env,
) {
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
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    console.error("kit_subscriber_request_failed", { status: response.status });
    throw new Error("Kit subscriber upsert failed");
  }

  const data: unknown = await response.json();
  if (!data || typeof data !== "object" || !("subscriber" in data)) {
    throw new Error("Kit subscriber acknowledgement missing");
  }
  const subscriber = data.subscriber;
  if (!subscriber || typeof subscriber !== "object" || !("id" in subscriber) ||
      typeof subscriber.id !== "number" || subscriber.id <= 0) {
    throw new Error("Kit subscriber acknowledgement invalid");
  }
  return { id: subscriber.id };
}
