import { afterEach, describe, expect, it, vi } from "vitest";
import { newsletterReceipt, postNewsletterSignup, submitNewsletter } from "./newsletter";
afterEach(() => { vi.unstubAllGlobals(); });

describe("production newsletter boundary", () => {
  it("sends the exact brand and accepts only a real acknowledgement", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    await postNewsletterSignup(" reader@example.com ", "arcitai", fetcher);
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe("https://gustavonline-api.gustavonline.workers.dev/newsletter");
    expect(JSON.parse(String(options?.body))).toEqual({email:"reader@example.com",source:"arcitai"});
    expect(options?.signal).toBeInstanceOf(AbortSignal);
  });
  it.each([[502, {ok:true}], [200, {ok:false}], [200, {}]])(
    "rejects HTTP %i without a valid acknowledgement", async (status, body) => {
      const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(body), {status}));
      await expect(postNewsletterSignup("reader@example.com", "gustavonline", fetcher)).rejects.toThrow();
    },
  );
  it("does not submit from a non-review localhost", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    vi.stubGlobal("window", {location:{hostname:"localhost"}});
    await expect(submitNewsletter("reader@example.com", "gustavonline")).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("does not invent confirmation on direct thank-you navigation", () => {
    vi.stubGlobal("sessionStorage", { getItem: () => null });
    expect(newsletterReceipt()).toBe(false);
  });
  it("expires an old acknowledgement without storing an email", () => {
    vi.stubGlobal("sessionStorage", {getItem:() => String(Date.now() - 3_600_001)});
    expect(newsletterReceipt()).toBe(false);
    vi.stubGlobal("sessionStorage", {getItem:() => String(Date.now())});
    expect(newsletterReceipt()).toBe(true);
  });
});
