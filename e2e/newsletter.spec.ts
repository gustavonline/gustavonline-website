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

test.afterEach(async ({ page }) => {
  // The legacy redirect can leave asset handlers running after the assertions.
  // Drain them before Playwright disposes their API responses and page context.
  await page.unrouteAll({ behavior: "wait" });
});

test("the exported week 47 letter has its real body and four working photos", async ({ page }, testInfo) => {
  const response = await page.goto("/notes/uge-47-brief/");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Newsletter · uge 47 (16-22. nov. 2026)");
  await expect(page.locator("article")).toContainText("Monday evening in Denmark.");
  await expect(page.locator("article")).toContainText("/Gustav, Denmark, 21:00");
  await expect(page.locator("article img")).toHaveCount(4);
  await expect.poll(() => page.locator("article img").evaluateAll((images) => images.every((image) =>
    image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0))).toBe(true);
  await expect(page.locator("body")).not.toContainText("Dine noter");
  await expect(page.locator("body")).not.toContainText("Not for posting as-is");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://gustavonline.com/notes/uge-47-brief");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: `output/playwright/week47-${testInfo.project.name}.png`, fullPage: true });
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
  const book = page.getByRole("button", { name: "Open newsletter 01: A useful note", exact: true });
  await book.focus(); await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("link", { name: "Open the full note" })).toHaveAttribute("href", post.url);
  await page.getByRole("button", { name: "Close newsletter" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(book).toBeFocused();
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

test("a failed second signup keeps its error in view", async ({ page }) => {
  await page.goto("/newsletter");
  await page.getByRole("textbox", { name: "Email address" }).fill("reader@example.com");
  await page.getByRole("button", { name: "Subscribe", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "You’re on the list" })).toBeInViewport();
  await page.route(`${api}/newsletter`, (route) => route.fulfill({ status: 502, json: { error: "Unavailable" } }));
  await page.getByRole("textbox", { name: "Email address" }).fill("reader@example.com");
  await page.getByRole("button", { name: "Subscribe", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "could not be completed" })).toBeInViewport();
  await expect(page.getByRole("textbox", { name: "Email address" })).toHaveValue("reader@example.com");
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

const shelfPosts = [
  post,
  { ...post, title: "Notes from the work", date: "2026-11-15T09:00:00Z", url: "https://gustavonline.com/notes/notes-from-the-work" },
  { ...post, title: "Keep the cards open", date: "2026-11-08", url: "https://gustavonline.com/notes/keep-the-cards-open" },
  { ...post, title: "Small teams, large models", date: "2026-11-01", url: "https://gustavonline.com/notes/small-teams" },
  { ...post, title: "The operating model", date: "2026-10-25", url: "https://gustavonline.com/notes/the-operating-model" },
  { ...post, title: "Orange and the shelf", date: "2026-10-18", url: "https://gustavonline.com/notes/orange-and-the-shelf" },
  { ...post, title: "A longer title about building software with context that still fits on a narrow book spine", date: "2026-10-11", url: "https://gustavonline.com/notes/longer-title" },
];

test("empty shelf has an honest noninteractive bookend and no canvas", async ({ page }, testInfo) => {
  await page.route(`${api}/posts?*`, (route) => route.fulfill({ json: { posts: [] } }));
  await page.goto("/newsletter#bookshelf");
  await expect(page.getByRole("status").filter({ hasText: "No newsletters published yet" })).toBeVisible();
  await expect(page.locator(".newsletter-volume-button")).toHaveCount(0);
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Previous newsletter" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Next newsletter" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Open newsletter", exact: true })).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: "0 newsletters" })).toBeVisible();
  await expect(page.locator(".newsletter-open-cursor")).not.toBeVisible();
  await page.locator("#bookshelf").evaluate((element) => element.scrollIntoView({ block: "start" }));
  await page.screenshot({ path: `output/playwright/css-shelf-empty-${testInfo.project.name}.png` });
  await page.getByRole("button", { name: /Switch to dark/ }).click();
  await page.locator("#bookshelf").evaluate((element) => element.scrollIntoView({ block: "start" }));
  await page.screenshot({ path: `output/playwright/css-shelf-empty-${testInfo.project.name}-dark.png` });
});

test("row selection turns one cover forward and keeps neighbours as numbered spines", async ({ page }, testInfo) => {
  await page.route(`${api}/posts?*`, (route) => route.fulfill({ json: { posts: shelfPosts } }));
  await page.goto("/newsletter#bookshelf");
  await expect(page.locator(".newsletter-volume-button")).toHaveCount(7);
  await expect(page.locator("canvas")).toHaveCount(0);
  const selected = page.locator(".newsletter-volume-slot.is-selected");
  await expect(selected).toHaveCount(1);
  await expect(selected.locator(".newsletter-volume-number")).toHaveText("01");
  await expect.poll(() => selected.locator(".newsletter-volume-solid").evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m11)).toBeGreaterThan(.85);
  await expect.poll(() => selected.locator(".newsletter-volume-solid").evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m43)).toBeGreaterThan(20);
  const second = page.locator(".newsletter-volume-slot").nth(1);
  await expect(second.locator(".newsletter-volume-number")).toHaveText("02");
  await expect(second.locator(".newsletter-volume-spine-title")).toHaveText("Notes from the work");
  await expect(second.locator(".newsletter-volume-spine-date")).toHaveText("2026-11-15");
  expect(Math.abs(await second.locator(".newsletter-volume-solid").evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m11))).toBeLessThan(.02);
  await page.getByRole("button", { name: "Next newsletter" }).click();
  await expect(second.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("status").filter({ hasText: "2 / 7" })).toBeVisible();
  await expect.poll(() => second.locator(".newsletter-volume-solid").evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m11)).toBeGreaterThan(.85);
  await expect.poll(() => page.locator(".newsletter-volume-slot").first().locator(".newsletter-volume-solid").evaluate((el) => Math.abs(new DOMMatrixReadOnly(getComputedStyle(el).transform).m11))).toBeLessThan(.02);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.locator("#bookshelf").evaluate((element) => element.scrollIntoView({ block: "start" }));
  await expect.poll(() => second.getByRole("button").evaluate((el) => el.getAnimations({ subtree: true }).filter((a) => a.playState === "running").length)).toBe(0);
  await page.screenshot({ path: `output/playwright/css-shelf-row-${testInfo.project.name}.png` });
  await page.getByRole("button", { name: /Switch to dark/ }).click();
  await page.locator("#bookshelf").evaluate((element) => element.scrollIntoView({ block: "start" }));
  await page.screenshot({ path: `output/playwright/css-shelf-row-${testInfo.project.name}-dark.png` });
});

test("a neighbouring spine opens its own issue and Close keeps it selected", async ({ page }) => {
  await page.route(`${api}/posts?*`, (route) => route.fulfill({ json: { posts: shelfPosts } }));
  await page.goto("/newsletter#bookshelf");
  await page.getByRole("button", { name: "Open newsletter 02: Notes from the work", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("heading")).toHaveText("Notes from the work");
  await page.getByRole("button", { name: "Close newsletter" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Open newsletter 02: Notes from the work", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("issue detail traps focus, closes with Escape and restores the selected book", async ({ page }, testInfo) => {
  await page.route(`${api}/posts?*`, (route) => route.fulfill({ json: { posts: shelfPosts } }));
  await page.goto("/newsletter#bookshelf");
  await page.getByRole("button", { name: "Next newsletter" }).click();
  const book = page.getByRole("button", { name: "Open newsletter 02: Notes from the work", exact: true });
  await book.click();
  const detail = page.getByRole("dialog");
  await expect(detail).toBeVisible();
  await expect(detail.getByRole("heading")).toHaveText("Notes from the work");
  await expect(detail).toContainText("2026-11-15");
  await expect(detail.locator("time")).toHaveText("2026-11-15");
  await expect(detail.locator("time")).toHaveAttribute("datetime", shelfPosts[1].date);
  await expect(detail).toContainText(post.summary);
  await expect(detail.getByRole("link", { name: "Open the full note" })).toHaveAttribute("href", shelfPosts[1].url);
  const close = detail.getByRole("button", { name: "Close newsletter" });
  await expect(close).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(detail.getByRole("link")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  await page.screenshot({ path: `output/playwright/css-shelf-detail-${testInfo.project.name}.png` });
  await page.keyboard.press("Escape");
  await expect(detail).not.toBeVisible();
  await expect(book).toBeFocused();
  await expect(book).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => page.evaluate(() => document.documentElement.style.overflow)).not.toBe("hidden");
});

test("keyboard browses the whole shelf and custom Open cursor is fine-pointer only", async ({ page }, testInfo) => {
  await page.route(`${api}/posts?*`, (route) => route.fulfill({ json: { posts: shelfPosts } }));
  await page.goto("/newsletter#bookshelf");
  const selected = page.locator(".newsletter-volume-button[aria-pressed=true]");
  await selected.focus();
  await page.keyboard.press("End");
  await expect(selected).toHaveAttribute("aria-label", /Open newsletter 07/);
  await expect(selected).toBeFocused();
  await expect(page.getByRole("button", { name: "Next newsletter" })).toBeDisabled();
  await page.keyboard.press("ArrowLeft");
  await expect(selected).toHaveAttribute("aria-label", /Open newsletter 06/);
  await page.keyboard.press("Home");
  await expect(selected).toHaveAttribute("aria-label", /Open newsletter 01/);
  await expect(page.getByRole("button", { name: "Previous newsletter" })).toBeDisabled();
  // Wait for the presentation to settle before moving the pointer onto the cover.
  await expect.poll(() => selected.locator(".newsletter-volume-solid").evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m11)).toBeGreaterThan(.85);
  async function hoverCover() {
    await selected.scrollIntoViewIfNeeded();
    // Deliver native scroll events before testing a fresh mouse hover.
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
    await selected.hover();
  }
  await hoverCover();
  const fine = await page.evaluate(() => matchMedia("(hover: hover) and (pointer: fine)").matches);
  const cursor = page.locator(".newsletter-open-cursor");
  if (fine) {
    await expect(cursor).toBeVisible();
    expect(await selected.evaluate((el) => getComputedStyle(el).cursor)).toBe("none");
    await page.screenshot({ path: `output/playwright/css-shelf-cursor-${testInfo.project.name}.png` });
    await page.mouse.move(10, 10);
    await expect(cursor).not.toBeVisible();
    expect(await selected.evaluate((el) => getComputedStyle(el).cursor)).not.toBe("none");
    await hoverCover();
    await expect(cursor).toBeVisible();
    await page.mouse.wheel(0, 120);
    await expect(cursor).not.toBeVisible();
    expect(await selected.evaluate((el) => getComputedStyle(el).cursor)).not.toBe("none");
    await hoverCover();
    await expect(cursor).toBeVisible();
    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    await expect(cursor).not.toBeVisible();
    await selected.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(cursor).not.toBeVisible();
    expect(await selected.evaluate((el) => getComputedStyle(el).cursor)).not.toBe("none");
  } else {
    await expect(cursor).not.toBeVisible();
    expect(await selected.evaluate((el) => getComputedStyle(el).cursor)).not.toBe("none");
  }
});

test("a deliberate pointer press on a distant edge spine opens it without scrolling the shelf", async ({ page }) => {
  await page.route(`${api}/posts?*`, (route) => route.fulfill({ json: { posts: shelfPosts } }));
  await page.goto("/newsletter#bookshelf");
  await page.locator("#bookshelf").evaluate((element) => element.scrollIntoView({ block: "start" }));
  const book = page.getByRole("button", { name: "Open newsletter 03: Keep the cards open", exact: true });
  const box = await book.boundingBox();
  const view = await page.locator(".newsletter-shelf-window").boundingBox();
  if (!box || !view) throw new Error("Shelf book is missing");
  // On phones this uses the small visible part of the third spine at the edge.
  const x = Math.min(box.x + box.width, view.x + view.width) - 2;
  const y = box.y + 100;
  await page.mouse.move(x, y);
  await page.mouse.down();
  // A human press lasts longer than Playwright's default down/up pair.
  await page.waitForTimeout(120);
  await page.mouse.up();
  await expect(page.getByRole("dialog").getByRole("heading")).toHaveText("Keep the cards open");
  expect(await page.locator(".newsletter-shelf-window").evaluate((el) => el.scrollLeft)).toBe(0);
  await page.mouse.click(5, 5);
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(book).toBeFocused();
  await expect(book).toHaveAttribute("aria-pressed", "true");
  expect(await page.locator(".newsletter-shelf-window").evaluate((el) => el.scrollLeft)).toBe(0);
});


test("shelf finish matches site controls in both themes and fits a 320px phone", async ({ page }, testInfo) => {
  await page.route(`${api}/posts?*`, (route) => route.fulfill({ json: { posts: shelfPosts } }));
  if (testInfo.project.name === "phone") await page.setViewportSize({ width: 320, height: 780 });
  await page.goto("/newsletter#bookshelf");
  const open = page.getByRole("button", { name: "Open newsletter", exact: true });
  const detail = page.getByRole("dialog");
  for (const theme of ["light", "dark"]) {
    if (theme === "dark") await page.getByRole("button", { name: /Switch to dark/ }).click();
    // Theme tokens update immediately; allow the control's 160ms colour transition to finish.
    const siteBackground = await page.locator(".family-signup button").evaluate((el) => getComputedStyle(el).backgroundColor);
    await expect(open).toHaveCSS("background-color", siteBackground);
    await expect(page.getByRole("region", { name: "Newsletter shelf", exact: true })).toBeVisible();
    await expect(page.getByRole("list", { name: "Published newsletters" })).toBeVisible();
    await expect(page.getByRole("group", { name: "Browse newsletters" })).toBeVisible();
    const styles = await open.evaluate((el) => {
      const own = getComputedStyle(el);
      const subscribe = getComputedStyle(document.querySelector(".family-signup button")!);
      return { background: own.backgroundColor, color: own.color, radius: own.borderRadius,
        siteBackground: subscribe.backgroundColor, siteColor: subscribe.color, siteRadius: subscribe.borderRadius,
        font: own.fontFamily, height: el.getBoundingClientRect().height };
    });
    expect(styles.background).toBe(styles.siteBackground);
    expect(styles.color).toBe(styles.siteColor);
    expect(styles.radius).toBe(styles.siteRadius);
    expect(styles.font).toContain("Figtree");
    expect(styles.height).toBeGreaterThanOrEqual(44);
    // Measure the actual CSS colors, including the translucent numbered band.
    // Canvas normalises color-mix() and composites the band over its book paper.
    async function contrast(target: ".newsletter-volume-number" | ".newsletter-shelf-open") {
      return page.locator(target).evaluateAll((elements) => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 1;
        const context = canvas.getContext("2d")!;
        function luminance(color: number[]) {
          const linear = color.slice(0, 3).map((c) => c / 255).map((c) => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
          return linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
        }
        return elements.map((el) => {
          const style = getComputedStyle(el);
          context.clearRect(0, 0, 1, 1);
          context.fillStyle = getComputedStyle(el.parentElement!).backgroundColor;
          context.fillRect(0, 0, 1, 1);
          context.fillStyle = style.backgroundColor;
          context.fillRect(0, 0, 1, 1);
          const background = luminance(Array.from(context.getImageData(0, 0, 1, 1).data));
          context.clearRect(0, 0, 1, 1);
          context.fillStyle = style.color;
          context.fillRect(0, 0, 1, 1);
          const ink = luminance(Array.from(context.getImageData(0, 0, 1, 1).data));
          return (Math.max(ink, background) + .05) / (Math.min(ink, background) + .05);
        });
      });
    }
    if (await page.evaluate(() => matchMedia("(hover: hover)").matches)) {
      await open.hover();
      await expect.poll(() => open.evaluate((el) => el.getAnimations().filter((a) => a.playState === "running").length)).toBe(0);
      expect((await contrast(".newsletter-shelf-open"))[0]).toBeGreaterThanOrEqual(4.5);
      await page.mouse.move(0, 0);
      await expect(open).toHaveCSS("background-color", siteBackground);
    }
    const badgeRatios = await contrast(".newsletter-volume-number");
    expect(Math.min(...badgeRatios)).toBeGreaterThanOrEqual(4.5);
    const controls = await page.getByRole("group", { name: "Browse newsletters" }).boundingBox();
    expect(controls!.x).toBeGreaterThanOrEqual(0);
    expect(controls!.x + controls!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    await expect.poll(() => page.locator(".newsletter-volume-solid").first().evaluate((el) => el.getAnimations().filter((a) => a.playState === "running").length)).toBe(0);
    await page.locator(".newsletter-shelf").screenshot({ path: `output/playwright/css-shelf-polish-whole-${testInfo.project.name}-${theme}.png` });
    await open.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `output/playwright/css-shelf-polish-controls-${testInfo.project.name}-${theme}.png` });
    await open.click();
    await expect(detail).toBeVisible();
    const dialogStyle = await detail.evaluate((el) => {
      const probe = document.createElement("span");
      probe.style.backgroundColor = "var(--panel)";
      document.body.append(probe);
      const sitePanel = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return { background: getComputedStyle(el).backgroundColor,
        sitePanel,
        width: el.getBoundingClientRect().width,
        linkHeight: el.querySelector("a")!.getBoundingClientRect().height,
      };
    });
    expect(dialogStyle.background).toBe(dialogStyle.sitePanel);
    expect(dialogStyle.width).toBeLessThan(page.viewportSize()!.width);
    expect(dialogStyle.linkHeight).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: `output/playwright/css-shelf-polish-dialog-${testInfo.project.name}-${theme}.png` });
    await page.getByRole("button", { name: "Close newsletter", exact: true }).click();
    await expect(open).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator("#bookshelf")).not.toContainText(/\bissues?\b/i);
  }
});
