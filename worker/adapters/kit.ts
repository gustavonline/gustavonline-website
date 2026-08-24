import type { NewsletterSource } from "../../shared/contracts/content";
import type { Env } from "../types";

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
  });

  if (!response.ok) {
    throw new Error("Kit subscriber upsert failed");
  }

  const data = (await response.json()) as { subscriber?: { id?: number }; id?: number };
  return data.subscriber ?? data;
}
