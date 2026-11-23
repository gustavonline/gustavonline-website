// Binding names/types come from `wrangler types`; widen literal vars for fixtures.
type StringBindings = {
  [K in keyof CloudflareBindings as CloudflareBindings[K] extends string ? K : never]: string;
};
export type Env = StringBindings & Partial<Pick<CloudflareBindings, "NEWSLETTER_DRAFTS">> & {
  KIT_API_KEY: string;
  NOTION_TOKEN: string;
};
