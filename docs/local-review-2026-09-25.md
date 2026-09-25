# Local family preview

Owner approval is for local implementation, not production deployment.
Open http://127.0.0.1:4181/ (including /newsletter).

Run npm run review:build then npm run review:preview. The static output is
output/family-preview/index.html. The review flag only allows mock forms on
loopback: no real signups, no email persistence, an explicit preview notice.
Ordinary non-review builds do not enable the mock or local sibling URLs.

The approved family brief and complete QA/handoff live at:
/Users/gustavanderson/Downloads/arcitai/design/customer-journey-2026-09-25/DESIGN.md
and /Users/gustavanderson/Downloads/arcitai/docs/local-review-2026-09-25.md.
These are documentation pointers, not runtime dependencies.

This repo retains its existing collage and Three.js bookshelf. New local
newsletter pages are not ready to replace the live signup integration until
the separate provider/release review. Typecheck, 11 tests and builds passed;
the existing dependency audit has 6 high and 2 moderate entries to review
before release. No production write/deployment occurred.
Latest September 25 follow-up: aligned outer shell, icon-only accent hover,
branded sibling footer marks and lowercase gustavonline are implemented locally.
Gustav now has social icons aligned under the portrait and four compact rows
(three projects plus Newsletter), without a Projects heading. A viewport-height
shell keeps short-page footers at the bottom. Both footer marks stay monochrome
on hover, while text retains the orange accent. Sourdough restores
current production homepage/About copy and the existing living pixel bread.
Refreshed cross-site browser proof and artifact binding live in the Arc’IT
repository's docs/local-review-2026-09-25.md. Production remains unchanged.
