# gustavonline Cloudflare Worker

This Worker is intentionally small.

It owns:

- `POST /newsletter`: create/update a subscriber in Kit.
- `GET /posts`: expose explicitly published website content from the unified Notion `Content` source.

It does not own:

- subscriber-to-Notion sync. Use Kit's Notion integration for that.
- email sending. Use Kit.
- editorial automation. Use Codex automation and `docs/codex-papers-automation.md`.
- Project Inquiries or future Testimonials. Arc'IT AI owns those responsibilities.
- Resources. The separate `onlinesourdough-resources` project owns them.

## Config

Static vars live in `wrangler.jsonc`:

- `NOTION_PAPERS_DATA_SOURCE_ID`: `ba101532-8866-4388-9597-1d07465e495b`
- `PUBLIC_SITE_URL` (retained for binding compatibility)
- `ALLOWED_ORIGINS`

Secrets:

```bash
npx wrangler secret put KIT_API_KEY
npx wrangler secret put NOTION_TOKEN
```

## Public content boundary

The legacy binding name `NOTION_PAPERS_DATA_SOURCE_ID` now selects Content.
A public entry must have `Status = Published`, `Type = Content` or `Edition`,
`Channels` containing `Website`, and an explicit HTTPS `Public URL`. The adapter
checks these fields again before returning only title, summary, date and URL.
Sources, drafts and newsletter-only editions are excluded. It never exports page
bodies or invents an unimplemented `/notes/:slug` destination. A Notion access
failure returns 502 rather than a misleading empty archive.

After deployment, verify access to this source with the Worker's existing
Notion connection. An empty successful feed is expected until eligible content
has actually been published; do not publish a private draft to test the binding.

## Local Dev

```bash
npm run worker:dev
```

## Deploy

```bash
npm run worker:deploy
```

## Responsibility model

The deployed `gustavonline-api` Worker is the shared newsletter/editorial
boundary for Gustav Online, Arc'IT AI, and onlinesourdough when those sites
integrate with it. The currently verified runtime consumer described by this
repository is Gustav Online's frontend for `/newsletter` and `/posts`; this
repository does not claim that Arc'IT AI or onlinesourdough currently calls the
newsletter endpoint.

Arc'IT AI owns Project Inquiries and future Testimonials. The separate
`onlinesourdough-resources` project owns Resources.

## Live rollback migration note

The deployed Worker may still expose the old `/project-inquiry` route as a
temporary rollback fallback. It is not part of this Gustav Online source
boundary and must not be removed live until separately authorized Arc'IT
cutover verification has passed.

After deploy, set the frontend build environment variables:

```bash
VITE_WRITING_ENDPOINT=https://gustavonline-api.gustavonline.workers.dev/posts
VITE_NEWSLETTER_ENDPOINT=https://gustavonline-api.gustavonline.workers.dev/newsletter
```
