# Cloudflare Backend Notes

This portfolio is built to deploy as a static GitHub Pages app. Dynamic features should be added through Cloudflare Workers or Cloudflare Pages Functions instead of Vercel or Next.js.

## Responsibility model

The deployed `gustavonline-api` Worker is the shared newsletter/editorial
boundary for Gustav Online, Arc'IT AI, and onlinesourdough when those sites
integrate with it. The currently verified runtime consumer described by this
repository is Gustav Online's frontend for newsletter signups and public posts;
this repository does not claim that Arc'IT AI or onlinesourdough currently calls
the newsletter endpoint.

Arc'IT AI owns Project Inquiries and future Testimonials. The separate
`onlinesourdough-resources` project owns Resources.

The intended content flow is:

1. Write papers/notes in Notion `PapersDB`.
2. Let a Cloudflare Worker read published papers from Notion or a synced store.
3. Expose the public issue archive to the portfolio through `VITE_WRITING_ENDPOINT`.
4. Send selected papers to the email list through Kit after the editorial workflow is tested.

## Newsletter Endpoint

Set this environment variable before building the frontend:

```bash
VITE_NEWSLETTER_ENDPOINT=https://gustavonline-api.gustavonline.workers.dev/newsletter
```

The frontend sends:

```json
{
  "email": "person@example.com",
  "source": "gustavonline"
}
```

Newsletter `source` values are explicit: `gustavonline`, `arcitai`, or
`onlinesourdough`. Client-provided values outside that allowlist are rejected.
Browser access is separately restricted to the exact origins in
`ALLOWED_ORIGINS`; the Worker does not use wildcard CORS.

The endpoint should return `200 OK` with:

```json
{
  "ok": true
}
```

The Worker should create/update the subscriber in Kit. Kit's own Notion integration should sync subscribers into Notion.

The shared payload contract lives in:

```txt
shared/contracts/content.ts
```

The Worker route validates the payload before calling:

```txt
worker/adapters/kit.ts
```

## Writing Endpoint

If writing should later come from Notion, set:

```bash
VITE_WRITING_ENDPOINT=https://gustavonline-api.gustavonline.workers.dev/posts
```

The endpoint should return:

```json
{
  "posts": [
    {
      "title": "Post title",
      "summary": "Short summary",
      "date": "2026-06-14",
      "url": "https://example.com/post"
    }
  ]
}
```

Until these variables are configured, the site uses local static content.

## Live rollback migration note

The deployed Worker may still expose the old `/project-inquiry` route as a
temporary rollback fallback. It is not part of this Gustav Online source
boundary and must not be removed live until separately authorized Arc'IT
cutover verification has passed.

## Notion Data Sources

Use the existing Notion databases:

- PapersDB: `collection://23fa9322-f9ee-4ffc-8c5a-a44a88b281e9`
- SubscribersDB: managed by Kit's Notion sync, not by the Worker.

The Worker can filter public archive entries where `Status = Published`.

Public posts should be returned as:

- `title`: `Title`
- `summary`: `Summary`
- `date`: `Publish date`
- `url`: `Public URL`, or a generated `/notes/:slug` URL

Signup handling should:

1. Validate email.
2. Create/update the subscriber in Kit.
3. Let Kit sync the subscriber to Notion.
4. Return `{ "ok": true }`.

## Worker Configuration

Public Worker vars live in `wrangler.jsonc`:

- `ALLOWED_ORIGINS`
- `NOTION_PAPERS_DATA_SOURCE_ID`
- `PUBLIC_SITE_URL`

Secrets must be set in Cloudflare and never committed:

```bash
wrangler secret put KIT_API_KEY
wrangler secret put NOTION_TOKEN
```

Worker code is split by boundary:

- `worker/index.ts`: route handlers
- `worker/http.ts`: JSON and CORS helpers
- `worker/adapters/kit.ts`: Kit API integration
- `worker/adapters/notion.ts`: Notion API integration and mapping
