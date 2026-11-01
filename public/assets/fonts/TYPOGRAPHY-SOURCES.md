# Typography sources · 1 November 2026

- Geist Pixel Square: the existing onlinesourdough original font, preserved byte for byte (SHA-256 `04f9cf917a824370c77fecbd743c99d0b3dfd2c6c906de959996ac6f7fb343b3`). SIL OFL 1.1. https://vercel.com/font. The Circle variant from `geist@1.9.0` was compared locally; Square remains selected for the brand. The rejected Serif candidate is archived with the first preview and is not a runtime asset.
- Figtree: `@fontsource-variable/figtree@5.3.0`, Latin variable original WOFF2, 300–900. https://fonts.google.com/specimen/Figtree. SIL OFL 1.1. Latin includes Danish æ, ø, å and typographic punctuation.
- Switzer: Indian Type Foundry / Fontshare. https://www.fontshare.com/fonts/switzer. ITF FFL 2.0, 17 August 2026; own-site self-hosting is permitted. Original WOFF2, 100–900. Binary excluded from Git because the licence restricts public redistribution. `scripts/prepare-brand-fonts.mjs` downloads it directly from Fontshare and verifies SHA-256 `d1bf801ffb1a6096def70a7c532255722ad87d948b13a8a586e342f7091f8ee4`. Build failure is explicit if the pinned source is unavailable or changed.
- Existing Geist Sans and all original notices remain with their existing sources.

Runtime fonts are served from this website's own origin. No runtime font CDN requests or OS font installation. Font files and their licences are excluded from this repository's MIT licence.
