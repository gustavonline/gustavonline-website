import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const directories: string[] = [];
afterEach(() => { for (const path of directories.splice(0)) rmSync(path, { recursive: true, force: true }); });

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "newsletter-export-"));
  directories.push(root);
  mkdirSync(join(root, "scripts")); mkdirSync(join(root, "worker"));
  writeFileSync(join(root, "package.json"), '{"type":"module"}');
  copyFileSync(new URL("../scripts/prepare-newsletters.mjs", import.meta.url), join(root, "scripts/prepare-newsletters.mjs"));
  copyFileSync(new URL("../worker/newsletter-renderer.ts", import.meta.url), join(root, "worker/newsletter-renderer.ts"));
  return root;
}

describe("GitHub Pages newsletter export", () => {
  it("allows a fresh checkout with the last edition removed to deploy its removal", () => {
    const root = fixture();
    expect(() => execFileSync(process.execPath, [join(root, "scripts/prepare-newsletters.mjs")])).not.toThrow();
    expect(existsSync(join(root, "dist/notes"))).toBe(false);
  });
  it("rejects malformed snapshots before writing a page", () => {
    const root = fixture();
    mkdirSync(join(root, "content/newsletters"), { recursive: true });
    writeFileSync(join(root, "content/newsletters/test.json"), JSON.stringify({
      url: "https://gustavonline.com/notes/test", title: 42, summary: "Preview", body: {}, date: "2026-01-01",
    }));
    expect(() => execFileSync(process.execPath, [join(root, "scripts/prepare-newsletters.mjs")], { stdio: "pipe" })).toThrow(/Invalid public edition/);
    expect(existsSync(join(root, "dist/notes/test/index.html"))).toBe(false);
  });
});
