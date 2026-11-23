import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "output/playwright/results",
  use: { baseURL: "https://gustavonline.com", screenshot: "only-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "phone", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } },
  ],
  webServer: {
    command: "npm run build && npm run preview -- --host 127.0.0.1 --port 4181 --strictPort",
    url: "http://127.0.0.1:4181/newsletter/", reuseExistingServer: false,
    env: { VITE_WRITING_ENDPOINT: "https://gustavonline-api.gustavonline.workers.dev/posts", VITE_REVIEW_PREVIEW: "false" },
  },
});
