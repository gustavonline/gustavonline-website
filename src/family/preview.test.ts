import { describe, expect, it } from "vitest";
import { familyHref, isLocalReview, previewReceipt, previewSubmission } from "./preview";
describe("review isolation", () => {
 it("requires both the explicit build flag and an exact loopback hostname", () => {
   expect(isLocalReview(true, "127.0.0.1")).toBe(true);
   expect(isLocalReview(true, "localhost")).toBe(true);
   for (const host of ["arcitai.com", "gustavonline.com", "onlinesourdough.com", "localhost.example.com", "127.0.0.1.example.com", ""]) expect(isLocalReview(true, host)).toBe(false);
   expect(isLocalReview(false, "127.0.0.1")).toBe(false);
 });
 it("uses production destinations outside the explicit review environment", () => {
   expect(familyHref("arcitai")).toBe("https://arcitai.com");
   expect(familyHref("gustavonline")).toBe("https://gustavonline.com");
   expect(familyHref("onlinesourdough")).toBe("https://onlinesourdough.com");
 });
 it("cannot acknowledge a submission outside local review", async () => {
   await expect(previewSubmission()).rejects.toThrow();
   expect(previewReceipt()).toBe(false);
 });
});
