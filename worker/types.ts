// Binding names/types come from `wrangler types`; widen literal vars for fixtures.
type StringBindings = {
  [K in keyof CloudflareBindings as CloudflareBindings[K] extends string ? K : never]: string;
};
export type Env = StringBindings & Partial<Pick<CloudflareBindings, "NEWSLETTER_DRAFTS" | "CONTENT_DASHBOARD">> & {
  KIT_API_KEY: string;
  NOTION_TOKEN: string;
  DASHBOARD_TOKEN?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
  DASHBOARD_ACCESS_EMAIL?: string;
};
