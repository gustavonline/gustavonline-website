# Portfolio design

## Brand references — 6 November 2026

Use each brand’s own typeface at **weight 400** for ordinary mentions and links:
Offers, mobile menus, portfolio cards, footers and “Part of”. Figtree represents
Gustav Online, Geist Pixel Square represents onlinesourdough, and Switzer
represents Arc’IT AI. Keep the surrounding text size and disable synthetic bold.

An actual site wordmark keeps its own identity: Gustav Online’s header remains
Figtree 600, onlinesourdough’s wordmark remains Pixel Square 400, and Arc’IT AI’s
logo remains its approved Switzer treatment. Brand symbols and SVG logo assets
are unchanged. A reference to a brand is not a request to reuse its heavier logo
weight. The reference selectors live in the site’s brand-typography stylesheet.

## Typography and identity · approved 1 November 2026

This is the current font mapping and supersedes the older dated typography notes.

| Brand | Wordmark | Website text |
| --- | --- | --- |
| Gustav Online | Figtree 600 | Figtree 400–500 |
| onlinesourdough | Original Geist Pixel Square 400 | Geist Sans 400–600 |
| Arc’IT AI | Switzer 500 | Switzer 400–600 |

Site wordmarks keep the logo weights above. Other named-brand references keep
their own font at weight 400 across Offers, mobile menus, portfolio links,
footers and Part of, with no synthetic bold. src/family/typography.css owns the font roles; site.css owns optical sizing.
Font sources and licences are documented in public/assets/fonts/.

The Gustav mark is an outlined Figtree 800 G with the original orange and
olive-green glow. Its two theme assets share geometry and colours, with a light
G on dark backgrounds. Cross-site brand links use this mark; personal portraits
remain photographs. Arc’IT’s symbol and the sourdough bread mark are unchanged.
SVG wordmarks and marks require no installed fonts. Switzer is fetched unchanged
from Fontshare at build time with a pinned checksum; its binary is not published
in Git. Runtime fonts are same-origin.

UI direction and external-link icons use the decorative SVG in
`src/family/ArrowIcon.tsx`, sized in em and coloured with currentColor.
Keep arrows out of copy strings: platform text fonts can render them as emoji.

Keep existing content, artwork, routes and interactions. Verify direct pages,
mobile navigation, both themes and shared brand labels before each release.

Newsletter canvas covers, spines, backs and shelf labels read the site font token
and wait for Figtree before painting. Font loading is cancelled on unmount.

The LinkedIn banner master is the 28 October variant B matte: preserve its exact
three-line copy, 365 contribution tiles, colours, coordinates and crop. Its main
text uses Figtree 500; the Gustav icon uses the new Figtree 800 G. The Arc’IT and
sourdough symbols remain unchanged.


The portfolio keeps Gustav Online's warm background (`#fbfaf7`), orange accent
(`#ee7f3c`), Figtree typography, portrait and narrow reading column.

## Family alignment

The header is 72px tall within the shared 1120px shell. Brand wordmarks use
each brand’s font and weight from the current mapping above. Body text uses Figtree. The main column is 648px with
16px project copy. The Arc’IT footer mark is the approved solid blue square
with the white six-piece symbol, also in dark mode.

Keep personal positioning broad and grounded in the work. Use Founder when a
role is useful; avoid self-appointed architect titles or a learning timeline.

## Contributions and identity

The field above the profile uses the dates, counts and levels in Gustav's public
GitHub contribution calendar. It includes anonymous private contribution counts
where GitHub exposes them, without private repository names or content. Idle
motion and pointer response change the presentation, not the underlying levels.

Top + Reveal is the default. Hovering near each mark reveals Arc'IT AI,
onlinesourdough or Gustav Online and its colour. The field fades to the right.
It respects reduced motion, and omits month labels, weekday labels and controls.
The existing left/flow URLs remain available as alternate views.

## Current work

Three project tabs and More projects share the available width with equal gaps.
The selected underline uses the orange accent. All four tabs have a small icon;
More projects uses a decorative collection symbol from the existing Lucide set,
in the text colour without a background.
On narrow screens the tabs form two rows. Keyboard arrows, Home and End switch
tabs, and inactive panels are inert. Panels share their height to prevent jumps.

The profile repository owns the selection, names and icon references. Agentic Systems
and OSM remain anchors; the third slot follows activity among the curated tools.
Other projects appear as compact links in the fourth tab. The website does not
independently rank projects, and it does not display commit-ranking commentary.

## One source for project text

The profile's `data/projects.json` owns selected repositories, stable GitHub IDs,
optional short names and editorial status. Its scheduled updater reads each
project's current README or GitHub description and generates both profile bullets
and website JSON. A `Why I built this` section contributes longer prose when
present; otherwise a short README introduction or repository description is used.
OpenPaperDesign now comes from `gustavonline/openpaperdesign`, not the archived
Arc’IT fork. The website does not keep a second authored project description.

The schema-3 projection is bundled at `public/data/github-profile.json` for the
first render and offline use. Production also fetches the public profile JSON.
Invalid or older-schema responses leave the bundled data intact. The profile's
scheduled/manual Action controls refresh; editing a project README is reflected
after that Action runs. `Explore {project name}` links use the same data.

Local README overrides are labelled `local-preview` and are rejected by the
deployment guard. Publish project READMEs first, then the updater and its normal
projection, then the website. See [delivery](docs/delivery.md) for the existing
feature → dev → main workflow. Revert a release through that workflow to restore
the prior site; profile data changes are recovered in the profile repository.

Project icon provenance is recorded in
[project marks](public/assets/project-marks/README.md). Upstream logos, licences
and credits remain owned by their respective projects.


## Approved mobile release — October25


The October25 owner correction replaces the in-flow panel with a full-viewport overlay. The compact
header stays reachable while scrolling, and Current work has an 84px anchor offset.
The newsletter shelf preserves vertical scrolling and pinch zoom. On phones the
page shell clips only the horizontal axis, so its overflow does not prevent the
sticky header from following the document scroll. These refinements
were checked by the lead after the Opus implementation.


## October 24 phone and tablet pass — local review

Desktop above 760px is unchanged: brand, Newsletter, theme, ~600px column.
At 760px and below the header is 64px: brand (photo mark + Pixel wordmark),
theme and an icon-only44px button, labelled Open menu/Close menu for assistive
technology. Its dialog includes the topbar and ordinary nav links; the opaque
fixed panel fills the viewport under the header without moving content, with
Home, Current work (`/#selected-work`),
Newsletter and the two other family sites. The closed panel is `hidden`. It
closes on Escape (focus returns to Menu), a link, a press or focus outside it,
and when the window grows past 760px. The panel scrolls within
`100dvh − header` and has 44px+ rows.

- One gutter token (`--page-gutter`, 20–24px on phones) aligns header, column,
  newsletter, shelf and footer. Body copy in action rows is 16px on phones.
  Project tabs stay 2 × 2 with 15px names. Directory rows are 44px tall.
- Phone field: same real calendar and Top + Reveal, with a 132px canvas. The
  outer spacing shrinks, so the tiles keep ~56–60px of ground on each side
  and assembling mark fragments are not clipped. Ambient motion runs without
  hover. A touch tap is a short, still press and release; scroll gestures,
  long presses and taps on controls or the open menu never pin a zone. This
  replaces the window `click` listener, which mobile Safari does not reliably
  deliver for non-interactive content. Reduced motion **or data saving**
  shows the complete settled frame.
- The newsletter shelf no longer blocks vertical page scrolling on touch;
  browsing is a horizontal drag. Its render loop pauses when the shelf is
  offscreen or the tab is hidden. On phones, shelf arrows and the reader close
  button are 44px, and the reader scrolls inside the stage instead of clipping.


## Brand touchpoints · 1 November 2026

Public sharing uses the 1200×630 same-origin social-preview.png, with outlined
brand fonts and the approved marks. Social links use YouTube, LinkedIn, X
(@_gustavonline) and GitHub; Instagram is removed by the owner’s instruction.
