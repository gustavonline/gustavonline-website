# Gustav Anderson

I'm Gustav, a founder working with data, AI and software.

Gustav Online brings together my projects, ideas and experiments, including the thinking behind onlinesourdough and Arc’IT AI.

The north star is **Business Freedom**: more control of time, capacity, and direction, not maximum automation.

This public repository contains the source for my portfolio website.

The public GitHub profile is maintained separately in [gustavonline/gustavonline](https://github.com/gustavonline/gustavonline).

## What I am building around

- **Gustav Online:** the personal site and public record of the work as it evolves.
- **AI-native systems:** useful software, workflows, APIs, prototypes, and decision support for founder-led businesses.
- **onlinesourdough:** the method, content, and resources for the DIY and done-with-you route.
- **Arc'IT AI:** the done-for-you delivery route.
- **Public learning:** practical notes, experiments, cases, videos, and reflections from building in public.
- **Technical range:** macOS, Windows, Power BI, React, TypeScript, TanStack, Tailwind CSS, Cloudflare, and practical AI workflows.

## How I think about the work

The through-line is turning business and technical complexity into systems that are structured, useful, and understandable. AI and automation are tools for that work, not the goal by themselves.

Gustav Online documents the thinking and evidence from the work. onlinesourdough makes the method and resources useful through DIY and done-with-you paths, while Arc'IT AI handles done-for-you delivery.

## Links

- Portfolio: [gustavonline.com](https://gustavonline.com)
- GitHub: [github.com/gustavonline](https://github.com/gustavonline)
- YouTube: [youtube.com/@gustavonline](https://www.youtube.com/@gustavonline)
- Arc'IT AI: [arcitai.com](https://arcitai.com)

## Website stack

- Vite
- React
- TypeScript
- TanStack Router
- TanStack Query
- Tailwind CSS
- GitHub Pages
- Cloudflare Workers for the deployed backend endpoints

## Template alignment

This repository follows the local SaaS template where it fits a landing page:

- thin route entrypoints
- feature folders for page UI and hooks
- shared contracts for API boundaries
- services separated from HTTP adapters
- Worker adapters for Kit and Notion
- CI gates for typecheck, tests and build

It intentionally does not include SaaS-only pieces such as auth, billing, dashboards, paid access or D1 migrations yet.

See:

- [docs/architecture.md](docs/architecture.md)
- [docs/agent_guide.md](docs/agent_guide.md)
- [docs/delivery.md](docs/delivery.md)

## Content architecture

- `src/site-data.ts` exports editable site content, metadata, links, social profiles, newsletter labels, and fallback notes.
- `src/routes/App.tsx` stays thin and hands rendering to `src/features/landing`.
- `src/features/landing` owns landing page components and browser/query hooks.
- `src/services/content.ts` owns the content/newsletter workflows.
- `src/adapters/http/content-api.ts` owns frontend HTTP calls.
- `shared/contracts/content.ts` owns API request/response contracts shared by the frontend and Worker.
- `worker/adapters` owns Kit and Notion integration details.
- `src/styles.css` owns visual design, spacing, typography, and responsive behavior.
- `index.html` only contains static fallback metadata. Runtime metadata is applied from `src/site-data.ts`.

## Local development

```bash
npm install
npm run dev
```

Run the merge gate locally:

```bash
npm run typecheck
npm run test
npm run build
```

## Deployment

The site is built with `npm run build` and deployed through the GitHub Pages workflow in `.github/workflows/deploy.yml`.

The deployed `gustavonline-api` Worker at
`https://gustavonline-api.gustavonline.workers.dev` is the shared
newsletter/editorial boundary for Gustav Online, Arc'IT AI, and onlinesourdough
when those sites integrate with it. The currently verified runtime consumer
described by this repository is Gustav Online; it does not claim that Arc'IT AI
or onlinesourdough currently calls the newsletter endpoint. Arc'IT AI owns
Project Inquiries and future Testimonials, while onlinesourdough-resources owns
Resources. See [docs/cloudflare-backend.md](docs/cloudflare-backend.md) and
[worker/README.md](worker/README.md).

## Current status

This profile and portfolio bring together the work, ideas and practical methods I share publicly.

## License

Original code and documentation are available under the [MIT License](LICENSE).
Third-party code, fonts, copied reference material, and other third-party assets
retain their own licenses and attribution. Brand names, logos, portraits, and
editorial media are not licensed for reuse by this software license.
See [third-party notices](THIRD_PARTY_NOTICES.md) and the bundled font license.
