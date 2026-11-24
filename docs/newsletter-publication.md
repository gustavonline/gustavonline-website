# Publishing newsletter pages

gustavonline.com uses Simply.com DNS and GitHub Pages hosting. The existing
apex A/AAAA records and www CNAME keep their GitHub Pages targets. There is
no gustavonline.com zone in the available Cloudflare account. Do not add
Cloudflare routes or migrate DNS as part of an ordinary newsletter release.

The `gustavonline-api` Worker serves the live newsletter feed at
`https://gustavonline-api.gustavonline.workers.dev/posts?format=newsletter`
and dynamic issues at its `/notes/:slug` endpoint. Public editions accept
either `Published` or `Publiceret`, still requiring Edition + Newsletter,
a past publish date, unique slug, and the exact public URL.
The existing mail cron still queries only `Published`; adding the Danish
archive alias does not enroll additional editions in draft preparation.

## Public body in Notion

When a Notion edition also holds editorial notes, give it exactly one
top-level toggle labelled **Public newsletter**. Its children are the entire
public body. The Worker reads only those children, including when the toggle
is on a later block page. Keep stable external HTTPS image URLs there.
Historical drafts, uploaded images and HTML previews outside the toggle stay
in Notion and are not traversed or published. An empty or duplicate public
toggle fails closed. Existing editions without this toggle retain the previous
whole-page behavior and must contain only supported public blocks.

## GitHub Pages export

`content/newsletters/*.json` contains reviewed public snapshots. `npm run build`
renders each into `dist/notes/:slug/index.html` with the same renderer as the
Worker. Node 22.18+ (or the CI's Node 24) is required for TypeScript imports.
The build works offline without Notion credentials and never contacts Kit.
GitHub Pages redirects the extensionless URL to its trailing-slash directory.

Week 47 was exported from the final HTML attachment on Notion edition
4216d2e1-7f56-8139-b8b0-d707dc66429d. Its four JPEGs were extracted unchanged
from that approved letter into `public/assets/notes/uge-47-brief/`. The private
notebook photo and earlier versions were excluded. The Notion public toggle
contains the same text, links and stable images as the committed snapshot.

For future releases or corrections, update the Notion public body and the
reviewed JSON snapshot together, check `npm run build` and the browser tests,
then merge through a reviewed PR. Notion changes update the live feed/Worker
body immediately; GitHub Pages body changes require a new repository deployment.
Unpublishing must also remove the committed snapshot and deploy that removal.
Do not send mail or alter a recorded Kit broadcast ID when exporting a page.

Deploy the merged Worker with `npm run worker:deploy`; its configuration has no
custom-domain routes and preserves the existing draft ledger and cron schedule.
