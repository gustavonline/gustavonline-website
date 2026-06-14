# Cloudflare Backend Notes

This portfolio is built to deploy as a static GitHub Pages app. Dynamic features should be added through Cloudflare Workers or Cloudflare Pages Functions instead of Vercel or Next.js.

The intended content flow is:

1. Write papers/notes in Notion `PapersDB`.
2. Let a Cloudflare Worker read published papers from Notion or a synced store.
3. Expose the public issue archive to the portfolio through `VITE_WRITING_ENDPOINT`.
4. Send selected papers to the email list through Kit after the editorial workflow is tested.

## Newsletter Endpoint

Set this environment variable before building the frontend:

```bash
VITE_NEWSLETTER_ENDPOINT=https://your-worker.your-subdomain.workers.dev/newsletter
```

The frontend sends:

```json
{
  "email": "person@example.com",
  "source": "gustavonline"
}
```

The endpoint should return `200 OK` with:

```json
{
  "ok": true
}
```

The Worker should create/update the subscriber in Kit. Kit's own Notion integration should sync subscribers into Notion.

## Writing Endpoint

If writing should later come from Notion, set:

```bash
VITE_WRITING_ENDPOINT=https://your-worker.your-subdomain.workers.dev/posts
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
