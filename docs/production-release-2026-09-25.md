# Production release — 2026-09-25

The owner approved the v4.2 family previews for all three production domains.
This supersedes the local-only boundary in local-review-2026-09-25.md.

## Release scope

- Preserve the approved homepages, brand-specific visuals, motion, shared navigation/footer and newsletter pages.
- Emit direct newsletter/thank-you HTML routes (and Arc’IT project inquiry).
- Use one shared newsletter Worker, with the originating brand in the source field.
- Only show the thank-you receipt after an acknowledged server success. Preview submissions remain restricted to explicit localhost review builds.
- Install patched development dependencies where needed; do not deploy the review build.

## Known operational blocker

The existing Kit API credential is rejected with upstream HTTP 401.
A scoped live check using the owner's authorized email confirmed this before and after the adapter hardening.
No valid Kit subscription was acknowledged. Forms retain the entered email and report failure; they must not show a false successful signup.

The owner must replace the existing Cloudflare `KIT_API_KEY` secret with a valid Kit v4 key, privately via the Cloudflare dashboard or `wrangler secret put KIT_API_KEY` in the gustavonline repository.
Do not paste the key into chat, commit it, purchase an API plan or send a campaign.
After replacement, verify one owner-authorized signup from each branded page, Kit acknowledgement, thank-you navigation and source attribution.
Welcome-email delivery/automation is not verified by the API acknowledgement alone.

## Recovery

Keep the previous production commit/deployment as the rollback point.
GitHub Pages: revert the release through the normal PR workflow and verify the Pages run.
Arc’IT Pages/Worker: redeploy the recorded prior deployment/version if production verification fails.
Detailed final commit, deployment and public readback evidence is recorded in the Arc’IT production release report.
