import type { Env } from "../types";

export async function upsertKitSubscriber(email: string, source: string, env: Env) {
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
