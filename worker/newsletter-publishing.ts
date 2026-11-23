import { createKitDraft, findKitBroadcast } from "./adapters/kit";
import {
  getPublicIssue, isPublicNewsletter, newsletterSlug, notionRequest,
  type NotionContent,
} from "./adapters/notion";
import { escapeHtml, renderBlocks } from "./newsletter-renderer";
import type { Env } from "./types";

export type DraftLedger = {
  isClaimed(): boolean;
  claim(): boolean;
  getId(): number | undefined;
  saveId(id: number): void;
  flush(): Promise<void>;
};

export async function prepareNewsletter(pageId: string, env: Env, ledger: DraftLedger) {
  // Re-read the page, rather than trusting the earlier cron listing.
  const page = await notionRequest<NotionContent>(`pages/${pageId}`, env);
  if (page.id !== pageId || page.parent?.data_source_id !== env.NOTION_PAPERS_DATA_SOURCE_ID
      || !isPublicNewsletter(page, env) || !page.properties?.["Send as newsletter"]?.checkbox) return;
  const recordedId = page.properties["Kit broadcast id"]?.rich_text?.map((p) => p.plain_text ?? "").join("");
  if (recordedId) return;
  const slug = newsletterSlug(page);
  const marker = `gustavonline:newsletter:${pageId}`;
  let id = ledger.getId();
  if (!id) {
    if (ledger.isClaimed()) {
      // Kit may already have accepted the original content; later edits must
      // not block recording its identity or cause another create request.
      id = await findKitBroadcast(marker, env);
    } else {
      const post = await getPublicIssue(slug, env);
      if (!post || post.pageId !== pageId) throw new Error("Published issue identity is ambiguous");
      const content = renderBlocks(post.body);
      if (!content.replace(/<[^>]*>/g, "").trim()) throw new Error("Newsletter body is empty");
      if (ledger.claim()) {
        // Persist the claim BEFORE calling Kit. A timeout can mean Kit accepted the POST.
        await ledger.flush();
        id = await createKitDraft(post.title, `<p><a href="${escapeHtml(post.url)}">Read on gustavonline</a></p>${content}`, post.summary, marker, env);
      } else {
        id = await findKitBroadcast(marker, env);
      }
    }
    if (!id) throw new Error("Draft reconciliation required; no new create request was made");
    ledger.saveId(id);
    await ledger.flush();
  }
  await notionRequest(`pages/${pageId}`, env, "PATCH", { properties: {
    "Kit broadcast id": { rich_text: [{ type: "text", text: { content: String(id) } }] },
    "Last processed": { date: { start: new Date().toISOString() } },
  } });
  console.info("newsletter_draft_prepared", { pageId, slug, broadcastId: id });
}
