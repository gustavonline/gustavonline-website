import { readFile } from 'node:fs/promises';

// A local README preview is useful for approval but must never reach the public site.
// This runs in the deploy workflow, leaving ordinary local builds available for review.
const file = process.argv[2] ?? new URL('../public/data/github-profile.json', import.meta.url);
const profile = JSON.parse(await readFile(file, 'utf8'));
const commit = /^[a-f0-9]{40}$/;
if (profile.schemaVersion !== 3 || !commit.test(profile.sourceRevision ?? '')) {
  throw new Error('Refresh the profile from published GitHub sources before deploying (no local-preview snapshot).');
}
if (!Array.isArray(profile.projects) || profile.projects.length !== 3 || !Array.isArray(profile.moreProjects)) {
  throw new Error('Expected the complete profile projection before deploying.');
}
let stories = 0;
for (const project of [...profile.projects, ...profile.moreProjects]) {
  if (!project.readme) continue;
  const { revision, url } = project.readme;
  if (!commit.test(revision ?? '') || url !== `https://github.com/${project.repo}/blob/${revision}/README.md#why-i-built-this`) {
    throw new Error(`Publish the README and refresh its projection before deploying: ${project.repo}`);
  }
  stories++;
}
if (!stories) throw new Error('No published project README sources in the projection.');
console.log(`PASS: ${stories} project README sources use published commit references.`);
