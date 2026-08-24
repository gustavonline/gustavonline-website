# gustavonline Cloudflare Worker

This Worker is intentionally small.

It owns:

- `POST /newsletter`: create/update a subscriber in Kit.
- `GET /posts`: expose published papers from Notion `PapersDB`.

It does not own:

- subscriber-to-Notion sync. Use Kit's Notion integration for that.
- email sending. Use Kit.
- editorial automation. Use Codex automation and `docs/codex-papers-automation.md`.
- Project Inquiries or future Testimonials. Arc'IT AI owns those responsibilities.
- Resources. The separate `onlinesourdough-resources` project owns them.

## Config

Static vars live in `wrangler.jsonc`:

- `NOTION_PAPERS_DATA_SOURCE_ID`: `23fa9322-f9ee-4ffc-8c5a-a44a88b281e9`
- `PUBLIC_SITE_URL`
- `ALLOWED_ORIGINS`

Secrets:

```bash
npx wrangler secret put KIT_API_KEY
npx wrangler secret put NOTION_TOKEN
```

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
