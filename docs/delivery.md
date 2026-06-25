# Delivery

This project follows the SaaS template delivery model, adjusted for a static landing page plus Cloudflare Worker endpoints.

## Branching

- `main`: production branch.
- `dev`: integration branch.
- `feature/<short-name>`: new work.
- `fix/<short-name>`: bug fixes.
- `chore/<short-name>`: maintenance.

Rules:

- Create feature branches from `dev`.
- Open pull requests back into `dev`.
- Release by opening a pull request from `dev` to `main`.
- Do not push directly to `main`.

## Merge Gate

Every PR should pass:

```bash
npm run typecheck
npm run test
npm run build
```

## Deployment

The static frontend is deployed to GitHub Pages from `main` by `.github/workflows/deploy.yml`.

The Cloudflare Worker is deployed separately with:

```bash
npm run worker:deploy
```

Worker deployment should be automated only after Cloudflare environments and secrets are confirmed.

## Required Build Env

The frontend can build without these variables and will fall back to local content:

```bash
VITE_WRITING_ENDPOINT=
VITE_NEWSLETTER_ENDPOINT=
```

Production deploys should set them to the live Worker endpoints:

```bash
VITE_WRITING_ENDPOINT=https://gustavonline-api.gustavonline.workers.dev/posts
VITE_NEWSLETTER_ENDPOINT=https://gustavonline-api.gustavonline.workers.dev/newsletter
```

## Worker Secrets

Set these in Cloudflare, not in git:

```bash
KIT_API_KEY=
NOTION_TOKEN=
```

Worker vars live in `wrangler.jsonc`:

- `ALLOWED_ORIGINS`
- `NOTION_PAPERS_DATA_SOURCE_ID`
- `PUBLIC_SITE_URL`

## Pull Request Notes

Include:

- short summary
- what changed
- tests run
- env or deploy notes
- screenshots for visual changes when useful
