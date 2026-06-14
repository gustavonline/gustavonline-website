# gustavonline Cloudflare Worker

This Worker is intentionally small.

It owns:

- `POST /newsletter`: create/update a subscriber in Kit.
- `GET /posts`: expose published papers from Notion `PapersDB`.

It does not own:

- subscriber-to-Notion sync. Use Kit's Notion integration for that.
- email sending. Use Kit.
- editorial automation. Use Codex automation and `docs/codex-papers-automation.md`.

## Config

Static vars live in `wrangler.jsonc`:

- `NOTION_PAPERS_DATA_SOURCE_ID`: `23fa9322-f9ee-4ffc-8c5a-a44a88b281e9`
- `PUBLIC_SITE_URL`
- `ALLOWED_ORIGIN`

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

After deploy, set the frontend build environment variables:

```bash
VITE_WRITING_ENDPOINT=https://gustavonline-api.<your-subdomain>.workers.dev/posts
VITE_NEWSLETTER_ENDPOINT=https://gustavonline-api.<your-subdomain>.workers.dev/newsletter
```
