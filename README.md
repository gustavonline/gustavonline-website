# Gustav Anderson

I'm an IT architect building a consultancy. I document everyday life, work and learnings, plus the thinking behind onlinesourdough.com.

My current direction is simple: understand complex systems, make them concrete, and turn that understanding into software, workflows, documentation, and useful services.

This repository has two jobs:

- It is my GitHub profile README.
- It is the source for my portfolio website.

## What I am building around

- **Software systems:** useful applications, prototypes, APIs, and workflows.
- **onlinesourdough:** content, resources, and direct access around IT, software, and business architecture.
- **Agentic engineering:** experiments with AI for planning, documentation, automation, and decision support.
- **Public learning:** notes, videos, and reflections from learning and building in public.
- **arcitai:** done-for-you IT architecture and software project work.
- **Technical range:** macOS, Windows, Power BI, React, TypeScript, TanStack, Tailwind CSS, Cloudflare, and practical AI workflows.

## How I think about the work

The model I am exploring is inspired by the idea of one core product delivered in multiple formats.

For me, the core product is the ability to turn technical complexity into something structured, useful, and understandable. Over time, that can become hands-on builds, focused strategy sessions, reusable templates, and educational content.

## Links

- Portfolio: [gustavonline.com](https://gustavonline.com)
- GitHub: [github.com/gustavonline](https://github.com/gustavonline)
- YouTube: [youtube.com/@gustavonline](https://www.youtube.com/@gustavonline)
- arcitai: [arcitai.com](https://arcitai.com)

## Website stack

- Vite
- React
- TypeScript
- TanStack Router
- TanStack Query
- Tailwind CSS
- GitHub Pages
- Cloudflare Workers for future backend endpoints

## Content architecture

- `src/site-data.ts` exports one `siteData` object with editable site content, metadata, links, social profiles, newsletter labels, and fallback notes.
- `src/routes/App.tsx` owns rendering and interaction only.
- `src/styles.css` owns visual design, spacing, typography, and responsive behavior.
- `index.html` only contains static fallback metadata. Runtime metadata is applied from `src/site-data.ts`.

## Local development

```bash
npm install
npm run dev
```

## Deployment

The site is built with `npm run build` and deployed through the GitHub Pages workflow in `.github/workflows/deploy.yml`.

Newsletter and writing integrations are intentionally frontend-configurable through Cloudflare Worker endpoints. See [docs/cloudflare-backend.md](docs/cloudflare-backend.md).

## Current status

This profile and portfolio are intentionally evolving. I use them as a public record of the journey through IT architecture, agentic engineering, software, and independent client work.
