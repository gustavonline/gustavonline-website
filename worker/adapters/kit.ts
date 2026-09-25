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
