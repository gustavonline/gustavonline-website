import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NewsletterShelf } from "./NewsletterShelf";

const issue = { title: "A useful note", date: "2026-11-22T09:00:00Z", summary: "From the work.", url: "https://gustavonline.com/notes/a-useful-note" };

describe("newsletter shelf presentation", () => {
  it("renders no fake issue or canvas for an empty archive", () => {
    const html = renderToStaticMarkup(<NewsletterShelf posts={[]} />);
    expect(html).toContain("Archive starts here."); expect(html).toContain("0 newsletters");
    expect(html).toContain("No newsletters published yet.");
    expect(html).not.toContain("<canvas"); expect(html).not.toContain("newsletter-volume-button");
    expect(html).not.toContain('aria-haspopup="dialog"');
    expect(html).not.toContain(">Open newsletter</button>");
  });
  it("exposes one selected issue and numbers every real spine", () => {
    const html = renderToStaticMarkup(<NewsletterShelf posts={[issue, { ...issue, title: "Next note", url: "https://gustavonline.com/notes/next-note" }]} />);
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(html.match(/aria-pressed="false"/g)).toHaveLength(1);
    expect(html).toContain('aria-label="Open newsletter 01: A useful note"');
    expect(html).toContain('aria-label="Open newsletter 02: Next note"');
    expect(html).toContain('aria-label="Previous newsletter"');
    expect(html).toContain('aria-label="Next newsletter"');
    expect(html).toContain('aria-label="Close newsletter"');
    expect(html).not.toMatch(/(?:aria-label|id)="[^"]*\bissues?\b/i);
    expect(html).toContain('class="newsletter-volume-spine-date">2026-11-22</span>');
    expect(html).not.toContain("<canvas");
  });
  it("escapes edition titles in book faces and accessible labels", () => {
    const html = renderToStaticMarkup(<NewsletterShelf posts={[{ ...issue, title: '<img src=x onerror="alert(1)">' }]} />);
    expect(html).not.toContain("<img"); expect(html).toContain("&lt;img");
  });
  it("shows calendar dates while retaining the machine-readable publication time", () => {
    const html = renderToStaticMarkup(<NewsletterShelf posts={[issue]} />);
    expect(html).toMatch(/<time[^>]*>2026-11-22<\/time>/);
    expect(html).toContain(issue.date);
  });
});
