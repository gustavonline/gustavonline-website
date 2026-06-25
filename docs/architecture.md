# Architecture

This project applies the SaaS template architecture to a personal landing page and portfolio site. The app should stay lighter than the full SaaS template, but keep the same boundary rules where they matter.

## Stack

- TypeScript
- React
- Vite
- TanStack Router
- TanStack Query
- Tailwind CSS
- Cloudflare Workers for dynamic endpoints
- GitHub Pages for the static frontend

Not included yet because the product does not need them:

- Auth.js
- Stripe
- D1 migrations
- dashboard routes
- paid access logic
- product analytics beyond basic hosting analytics

## Folder Structure

```txt
src/
|-- adapters/
|   `-- http/
|-- config/
|-- features/
|   `-- landing/
|       |-- components/
|       `-- hooks/
|-- lib/
|-- routes/
|-- services/
|-- router.tsx
`-- styles.css
shared/
|-- contracts/
`-- index.ts
tests/
worker/
|-- adapters/
|-- http.ts
|-- index.ts
`-- types.ts
```

## Responsibilities

- `src/routes/`: thin route entrypoints only.
- `src/features/landing/`: landing page UI, browser hooks, and feature composition.
- `src/services/`: product workflows such as fetching writing and submitting newsletter signups.
- `src/adapters/http/`: frontend HTTP implementation details.
- `src/config/`: client environment variable reads and project configuration.
- `src/lib/`: shared app utilities such as the Query client.
- `shared/contracts/`: framework-free request and response contracts used by both the frontend and Worker.
- `worker/adapters/`: infrastructure integrations such as Kit and Notion.
- `worker/index.ts`: Worker request routing and endpoint handlers.

## Boundary Rules

- React components should not call Kit, Notion, Cloudflare bindings, or other infrastructure directly.
- Feature hooks may call services and Query, but should not own API response parsing.
- Services should express the workflow and delegate remote details to adapters.
- Worker routes should validate request bodies with shared contracts before calling adapters.
- Shared contracts must not import React, Vite, Cloudflare, Kit, Notion, or browser-only APIs.

## Landing Page Scope

Because this is a landing page, the default answer to SaaS features is no until a real product need appears. Do not add auth, billing, database migrations, dashboards, or background queues just to mirror the template.

Useful template pieces for this project are:

- thin routes
- feature folders
- typed contracts
- env documentation
- CI gates
- Cloudflare Worker adapters
- tests around boundary parsing and product logic

## External Integrations

The frontend can run without dynamic endpoints. If these env vars are not present at build time, it uses local fallback content:

```bash
VITE_WRITING_ENDPOINT=
VITE_NEWSLETTER_ENDPOINT=
```

The Worker owns the live integrations:

- `GET /posts` reads published Notion pages.
- `POST /newsletter` validates the signup payload and upserts a Kit subscriber.

Required Worker vars and secrets are documented in `docs/cloudflare-backend.md`.
