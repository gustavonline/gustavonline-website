import type { NotionBlock, RichText } from "./adapters/notion";
import type { WritingPost } from "../shared/contracts/content";

export function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function safeUrl(value: string | null | undefined, image = false) {
  try {
    const url = new URL(value ?? "");
    return (url.protocol === "https:" || (!image && url.protocol === "mailto:")) ? url.href : null;
  } catch { return null; }
}

function richText(parts: RichText[] = []): string {
  return parts.map((part) => {
    let text = escapeHtml(part.plain_text ?? part.text?.content ?? "").replaceAll("\n", "<br>");
    const a = part.annotations;
    if (a?.code) text = `<code>${text}</code>`;
    if (a?.bold) text = `<strong>${text}</strong>`;
    if (a?.italic) text = `<em>${text}</em>`;
    if (a?.strikethrough) text = `<s>${text}</s>`;
    if (a?.underline) text = `<u>${text}</u>`;
    const url = part.type === "mention" ? null : safeUrl(part.href ?? part.text?.link?.url);
    return url ? `<a href="${escapeHtml(url)}" rel="noopener noreferrer">${text}</a>` : text;
  }).join("");
}

export function renderBlocks(blocks: NotionBlock[]): string {
  let html = ""; let list: "ul" | "ol" | null = null;
  for (const block of blocks) {
    const data = block[block.type] as { rich_text?: RichText[]; caption?: RichText[]; type?: string; external?: { url?: string } } | undefined;
    const listType = block.type === "bulleted_list_item" ? "ul" : block.type === "numbered_list_item" ? "ol" : null;
    if (list !== listType) { if (list) html += `</${list}>`; if (listType) html += `<${listType}>`; list = listType; }
    const text = richText(data?.rich_text);
    const nested = block.children?.length ? renderBlocks(block.children) : "";
    switch (block.type) {
      case "paragraph": html += `<p>${text}</p>${nested}`; break;
      case "heading_1": case "heading_2": case "heading_3": {
        const tag = block.type === "heading_3" ? "h3" : "h2";
        html += `<${tag}>${text}</${tag}>${nested}`; break;
      }
      case "bulleted_list_item": case "numbered_list_item": html += `<li>${text}${nested}</li>`; break;
      case "quote": case "callout": html += `<blockquote>${text}${nested}</blockquote>`; break;
      case "code": html += `<pre><code>${escapeHtml((data?.rich_text ?? []).map((p) => p.plain_text ?? p.text?.content ?? "").join(""))}</code></pre>`; break;
      case "divider": html += "<hr>"; break;
      case "image": {
        // Notion-hosted signed image links expire; require stable external HTTPS assets.
        const url = data?.type === "external" ? safeUrl(data.external?.url, true) : null;
        if (!url) throw new Error("Use a stable external HTTPS image in the edition");
        const caption = richText(data?.caption);
        html += `<figure><img src="${escapeHtml(url)}" alt="${escapeHtml((data?.caption ?? []).map((p) => p.plain_text ?? "").join(""))}">${caption ? `<figcaption>${caption}</figcaption>` : ""}</figure>`; break;
      }
      default: throw new Error(`Unsupported newsletter block: ${block.type}`);
    }
  }
  return html + (list ? `</${list}>` : "");
}

export function renderIssue(issue: WritingPost & { body: NotionBlock[] }, siteUrl: string): string {
  const site = new URL(siteUrl).origin;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(issue.title)} | gustavonline</title><meta name="description" content="${escapeHtml(issue.summary)}"><link rel="canonical" href="${escapeHtml(issue.url)}"><style>
@font-face{font-family:Figtree;src:url('${site}/assets/fonts/figtree-latin-variable.woff2') format('woff2');font-weight:400 700;font-display:swap}
:root{color-scheme:light dark;--bg:#f5f6f5;--text:#1f1f1f;--muted:#60635f;--line:#dddfdd;--accent:#ee7f3c}
@media(prefers-color-scheme:dark){:root{--bg:#20201d;--text:#f3f0ea;--muted:#b7b8af;--line:#41413a}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:18px/1.7 Figtree,system-ui,sans-serif}header,main,footer{max-width:696px;margin:auto;padding:28px 24px}header{border-bottom:1px solid var(--line);display:flex;justify-content:space-between;gap:20px}header a{font-size:16px}a{color:var(--text);text-decoration-color:var(--accent);text-underline-offset:4px}a:hover{color:var(--accent)}h1{font-size:clamp(32px,6vw,48px);line-height:1.15;font-weight:500;letter-spacing:-1px}h2,h3{line-height:1.3;font-weight:500;margin-top:2em}.byline,footer{color:var(--muted);font-size:15px}.summary{color:var(--muted)}article{overflow-wrap:anywhere}blockquote{border-left:3px solid var(--accent);margin:24px 0;padding-left:22px}pre{overflow:auto;background:color-mix(in srgb,var(--text) 5%,var(--bg));padding:20px}code{font-size:.9em}figure{margin:28px 0}img{max-width:100%;height:auto}figcaption{font-size:14px;color:var(--muted)}hr{border:0;border-top:1px solid var(--line);margin:36px 0}footer{border-top:1px solid var(--line);margin-top:32px}
</style></head><body><header><a href="${site}/">gustavonline</a><a href="${site}/newsletter#bookshelf">The Bookshelf</a></header><main><p class="byline">Notes from the work · Gustav Anderson · <time>${escapeHtml(issue.date)}</time></p><h1>${escapeHtml(issue.title)}</h1><p class="summary">${escapeHtml(issue.summary)}</p><article>${renderBlocks(issue.body)}</article></main><footer><a href="${site}/newsletter">Subscribe to Notes from the work</a></footer></body></html>`;
}
