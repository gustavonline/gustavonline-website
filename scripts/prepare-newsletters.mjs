import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { renderIssue } from "../worker/newsletter-renderer.ts";

// Reviewed public snapshots only. No Notion credentials, drafts or mail calls
// belong in a GitHub Pages build. The Worker uses the same HTML renderer.
const origin = "https://gustavonline.com";
const editions = new URL("../content/newsletters/", import.meta.url);
const files = await readdir(editions).catch((error) => {
  if (error.code === "ENOENT") return [];
  throw error;
});
for (const filename of files.filter((name) => name.endsWith(".json"))) {
  const slug = filename.slice(0, -5);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 120) throw new Error("Invalid edition slug");
  const issue = JSON.parse(await readFile(new URL(filename, editions), "utf8"));
  if (issue.url !== `${origin}/notes/${slug}` || typeof issue.title !== "string" || !issue.title.trim()
      || typeof issue.summary !== "string" || !Array.isArray(issue.body) || !issue.body.length
      || !Number.isFinite(Date.parse(issue.date)) || Date.parse(issue.date) > Date.now()) {
    throw new Error(`Invalid public edition: ${filename}`);
  }
  const directory = new URL(`../dist/notes/${slug}/`, import.meta.url);
  await mkdir(directory, { recursive: true });
  await writeFile(new URL("index.html", directory), renderIssue(issue, origin));
  console.log(`Prepared public newsletter /notes/${slug}/`);
}
