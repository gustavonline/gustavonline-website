/// <reference types="@cloudflare/workers-types" />
import { prepareNewsletter, type DraftLedger } from "./newsletter-publishing";
import type { Env } from "./types";

// Fetch-style Durable Object keeps the private binding separate from the public router.
// One object per Notion page; the synchronous SQLite claim remains atomic across awaits.
export class NewsletterDrafts {
  constructor(private readonly ctx: DurableObjectState, private readonly env: Env) {
    ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS draft (singleton INTEGER PRIMARY KEY CHECK(singleton = 1), broadcast_id INTEGER)");
  }

  async fetch(request: Request): Promise<Response> {
    const pageId = new URL(request.url).pathname.slice(1);
    const ledger: DraftLedger = {
      claim: () => this.ctx.storage.sql.exec("INSERT OR IGNORE INTO draft (singleton) VALUES (1)").rowsWritten === 1,
      getId: () => this.ctx.storage.sql.exec<{ broadcast_id: number | null }>("SELECT broadcast_id FROM draft WHERE singleton = 1").toArray()[0]?.broadcast_id ?? undefined,
      saveId: (id) => { this.ctx.storage.sql.exec("UPDATE draft SET broadcast_id = ? WHERE singleton = 1", id); },
      flush: () => this.ctx.storage.sync(),
    };
    try {
      await prepareNewsletter(pageId, this.env, ledger);
      return new Response(null, { status: 204 });
    } catch {
      console.error("newsletter_draft_failed", { pageId });
      return new Response("Draft preparation needs attention", { status: 502 });
    }
  }
}
