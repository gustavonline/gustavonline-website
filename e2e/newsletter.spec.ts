import { expect, test } from "@playwright/test";
import { issueResponseHeaders, renderIssue } from "../worker/newsletter-renderer";

const api = "https://gustavonline-api.gustavonline.workers.dev";
const post = { title: "A useful note", summary: "A lesson from the work.", date: "2026-11-22", url: "https://gustavonline.com/notes/a-useful-note" };

test.beforeEach(async ({ page }) => {
  // Exercise the production host guard and real production bundle, with EVERY
  // request intercepted. Only the local preview server is contacted.
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === api && url.pathname === "/posts") {
      expect(url.searchParams.get("format")).toBe("newsletter");
      await route.fulfill({ json: { posts: [post] } }); return;
    }
    if (url.origin === api && url.pathname === "/newsletter") {
      expect(route.request().method()).toBe("POST");
      expect(route.request().postDataJSON()).toEqual({ email: "reader@example.com", source: "gustavonline" });
      await route.fulfill({ json: { ok: true } }); return;
    }
    if (url.origin === "https://gustavonline.com") {
      if (url.pathname === "/notes/a-useful-note") {
        await route.fulfill({ headers: issueResponseHeaders, body: renderIssue({ ...post, body: [
          { type: "paragraph", paragraph: { rich_text: [{ plain_text: "A complete newsletter body." }] } },
        ] }, url.origin) }); return;
      }
      const response = await route.fetch({ url: `http://127.0.0.1:4181${url.pathname}${url.search}` });
      await route.fulfill({ response }); return;
    }
    throw new Error(`Unexpected external request: ${url.origin}`);
  });
});

for (const entry of ["/newsletter/", "/newsletter", "/newsletter#bookshelf"]) {
test(`signup from ${entry} confirms beside the visible bookshelf`, async ({ page }, testInfo) => {
  await page.goto(entry);
  await page.getByRole("textbox", { name: "Email address" }).fill("reader@example.com");
  await page.getByRole("button", { name: "Subscribe", exact: true }).click();
  await expect(page).toHaveURL("https://gustavonline.com/newsletter#bookshelf");
  await expect(page.getByRole("status").filter({ hasText: "You’re on the list" })).toBeInViewport();
  await expect(page.getByRole("button", { name: "Subscribe", exact: true })).toBeEnabled();
  await expect(page.getByRole("textbox", { name: "Email address" })).toHaveValue("");
  await expect(page.locator(".family-signup")).toHaveAttribute("aria-busy", "false");
  await expect(page.getByRole("heading", { name: "The Bookshelf", exact: true })).toBeInViewport();
  await expect(page.getByRole("status").filter({ hasText: "1 / 1" })).toBeVisible();
  const canvas = page.locator(".bookshelf-canvas");
  await expect(page.locator(".bookshelf-stage")).toHaveClass(/is-ready/);
  await canvas.focus(); await page.keyboard.press("Enter");
  await expect(page.getByRole("link", { name: "Open the full note" })).toHaveAttribute("href", post.url);
  await page.getByRole("button", { name: "Close newsletter issue" }).click();
  await expect(page.locator(".bookshelf-stage")).not.toHaveClass(/is-reading/);
  await page.screenshot({ path: `output/playwright/signup-${testInfo.project.name}.png` });
  await page.getByRole("button", { name: /Switch to dark/ }).click();
  await page.screenshot({ path: `output/playwright/signup-${testInfo.project.name}-dark.png` });
});
}

test("successful signup is acknowledged even when session storage is unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new Error("Storage blocked"); };
  });
  await page.goto("/newsletter");
  await page.getByRole("textbox", { name: "Email address" }).fill("reader@example.com");
  await page.getByRole("button", { name: "Subscribe", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "You’re on the list" })).toBeInViewport();
  await expect(page.getByRole("button", { name: "Subscribe", exact: true })).toBeEnabled();
});

test("a failed acknowledgement retains the email and shows no success", async ({ page }) => {
  await page.route(`${api}/newsletter`, (route) => route.fulfill({ status: 502, json: { error: "Unavailable" } }));
  await page.goto("/newsletter/");
  await page.getByRole("textbox", { name: "Email address" }).fill("reader@example.com");
  await page.getByRole("button", { name: "Subscribe", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "could not be completed" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Email address" })).toHaveValue("reader@example.com");
  await expect(page.getByText("You’re on the list.", { exact: false })).toHaveCount(0);
});

test("the old thank-you URL returns to the shelf without inventing a receipt", async ({ page }) => {
  await page.goto("/newsletter/thank-you/");
  await expect(page).toHaveURL("https://gustavonline.com/newsletter#bookshelf");
  await expect(page.getByRole("heading", { name: "The Bookshelf", exact: true })).toBeInViewport();
  await expect(page.getByText("You’re on the list.", { exact: false })).toHaveCount(0);
});

test("the rendered issue is readable and links back to the Bookshelf", async ({ page }, testInfo) => {
  const cspErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && /content.security.policy/i.test(message.text())) cspErrors.push(message.text());
  });
  await page.goto("/notes/a-useful-note");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(post.title);
  await expect(page.getByRole("article")).toContainText("A complete newsletter body.");
  await expect(page.getByRole("link", { name: "The Bookshelf" })).toHaveAttribute("href", "https://gustavonline.com/newsletter#bookshelf");
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check("400 18px Figtree"))).toBe(true);
  expect(cspErrors).toEqual([]);
  await page.screenshot({ path: `output/playwright/issue-${testInfo.project.name}.png` });
});
