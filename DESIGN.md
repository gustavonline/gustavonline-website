# Portfolio design

The portfolio keeps Gustav Online's warm background (`#fbfaf7`), orange accent
(`#ee7f3c`), Geist typography, portrait and narrow reading column.

## Family alignment

The header is 72px tall within the shared 1120px shell. Brand wordmarks use
18px type: Geist Pixel for gustavonline/onlinesourdough and Inter for Arc’IT,
all at weight 400. Body text uses Geist Sans. The main column is 648px with
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

The profile repository owns the selection, names and icon references. Factory
and AIOS remain anchors; the third slot follows activity among the curated tools.
Other projects appear as compact links in the fourth tab. The website does not
independently rank projects, and it does not display commit-ranking commentary.

## One source for project text

Factory, AIOS and OpenPaperDesign each own a `Why I built this` README section.
The profile updater reads it at a pinned public commit: the first paragraph
supplies the profile summary, and the whole section supplies the website panel.
OpenPaperDesign's attribution to paper-rs and Michael Shimeles comes from that
same section. Simple GitHub attribution links render as React nodes; no raw
HTML or general Markdown renderer is used.

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
