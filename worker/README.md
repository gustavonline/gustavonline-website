# Gustavonline newsletter Worker

The frontend remains on GitHub Pages. This Worker owns:

- `POST /newsletter`: validate a signup and create/update its Kit subscriber.
- `GET /posts`: public metadata; `?format=newsletter` selects the Bookshelf.
- `GET /notes/:slug`: render a public newsletter edition from Notion.
- A 15-minute cron: prepare **Kit drafts only** for published editions.

Kit owns delivery, unsubscribe links and subscriber sync. Gustav reviews and
sends each draft in Kit. There is no broadcast send, schedule or update endpoint.
Reading public routes never creates a broadcast.

## Editorial workflow

Use the existing [Content database](https://app.notion.com/p/defb33bfbef24017bfb4a682c1946050),
source `ba101532-8866-4388-9597-1d07465e495b`. The binding retains the compatibility
name `NOTION_PAPERS_DATA_SOURCE_ID`. Keep human drafts in Notion.

1. Write the body. Set `Type = Edition`, `Format = Newsletter`, `Title` and
   `Summary`. `Channels = Newsletter` is sufficient for a newsletter edition.
2. Choose a unique `Slug`: lowercase letters, digits and single separating
   hyphens, up to 120 characters. Set `Public URL` to exactly
   `https://gustavonline.com/notes/<slug>` (no trailing slash).
3. When Gustav approves web publication, set the actual `Publish date` and
   `Status = Published`. Future dates remain private until due. The edition
   now appears in the Bookshelf and its route can be read.
4. Check `Send as newsletter` to request a **draft**, leaving `Kit broadcast id`
   empty. Within 15 minutes, the cron creates a private Kit broadcast with
   `send_at: null`, recording its ID and `Last processed` in Notion.
5. Review the draft in Kit: content, sender, template, recipients and unsubscribe
   footer. Send it yourself. A checked box on a Draft or Ready row does nothing.

Existing broadcast IDs are never overwritten and broadcasts are never edited.
Changes to Notion after draft creation must be reconciled in Kit by the editor.
Do not clear an ID to ask for an updated or second send.

## Public content boundary

Bodies require Published + Edition + Newsletter format, a valid unique slug, an
explicit matching Public URL, a nonempty title and a due publication date.
Archived/trashed pages and duplicate published slugs are rejected. Ordinary
website content retains Published + Content/Edition + Website channel + HTTPS
Public URL as its metadata boundary. Other Content records remain private.

The shared web/email renderer escapes text and attributes and permits HTTPS
and mailto links. It supports paragraphs, headings, nested lists, quotes,
callouts, code, dividers and stable external HTTPS images. Notion-hosted image
URLs expire; use a stable asset. Unsupported blocks, child pages, linked databases
and synced blocks fail the issue rather than dropping text or following private
content. Bodies are limited to 500 blocks and six nested levels. Collections and
block children are paginated. Errors expose no provider details. Issue responses
use `no-store`; metadata feeds never export page bodies.

## Duplicate protection and recovery

`NEWSLETTER_DRAFTS` is a SQLite Durable Object, one per Notion page. Its atomic
claim persists **before** the Kit POST. The returned Kit ID persists before
writing to Notion. Concurrent cron runs cannot create the same draft twice.

After a timeout or invalid acknowledgement, the claim stays in place. Later runs
search the exact description `gustavonline:newsletter:<notion-page-id>` across
Kit's paginated broadcasts, including ones Gustav may already have sent. They
recover its ID but never repeat the create request. No unique match means manual
reconciliation. A failed Notion write retries with the stored ID. Logs contain
page/broadcast IDs, not addresses or bodies.

For recovery, locate the marker in Kit and record the confirmed `Kit broadcast
id` in Notion. If Kit definitively created nothing, an operator can manually
create a draft and record its ID. Keep the durable claim: clearing fields or
losing a response must not create a second broadcast.

## Configuration and release

Vars: `ALLOWED_ORIGINS`, `NOTION_PAPERS_DATA_SOURCE_ID`, `PUBLIC_SITE_URL`.
Secrets stay in Cloudflare: `KIT_API_KEY` (Kit v4) and `NOTION_TOKEN` (read Content
and blocks, update page properties). No new GitHub secrets or public admin route.

This PR does not deploy or publish. After merge approval, release requires:

1. Confirm the Worker integration can read Content and update metadata, and the
   Kit key is valid. An older release note records a rejected key; this PR does
   not claim that the live credential has been repaired.
2. Confirm the apex and www DNS records are proxied by Cloudflare, preserving
   GitHub Pages as origin. The declared `/notes/*` routes require proxied DNS.
   At implementation time the site responded directly from GitHub Pages;
   Worker routes alone cannot intercept an unproxied hostname.
3. Deploy the Worker with its SQLite migration and 15-minute cron. Deploy the
   frontend through the approved merge/release process.
4. Verify `/posts?format=newsletter` and an **approved, already-public** issue at
   its actual URL. Do not publish unfinished work to test the integration.
5. Verify one owner-authorized signup and Kit acknowledgement separately.
   Automated tests mock providers; they do not prove live credentials or email
   delivery. Sending remains Gustav's action in Kit.

The deployed shared Worker may retain an old `/project-inquiry` rollback handler.
The existing Arc'IT cutover prerequisite still applies: verify it before replacing
any deployed version that still needs that fallback. This PR does not authorize
removing it live.

Frontend build vars remain:

```sh
VITE_WRITING_ENDPOINT=https://gustavonline-api.gustavonline.workers.dev/posts
VITE_NEWSLETTER_ENDPOINT=https://gustavonline-api.gustavonline.workers.dev/newsletter
```

Local checks (no production deploy or real broadcast):

```sh
npm run typecheck
npm test
npm run build
npm run test:browser
npx wrangler deploy --dry-run
```

Browser tests serve the production bundle locally and intercept every request.
They cover desktop/phone success, failure and legacy URLs without contacting Kit
or production APIs. `npm run worker:dev` starts the local Worker. Use
`--test-scheduled` only with test credentials/provider interception: live
credentials can create real drafts. Never test with a real send.

Regenerate bindings after config edits:
`npx wrangler types worker/bindings.d.ts --env-interface CloudflareBindings --include-runtime false`.
