type ClientEnvKey = "VITE_WRITING_ENDPOINT" | "VITE_NEWSLETTER_ENDPOINT";

export const clientEnv = {
  writingEndpoint: getOptionalEnv("VITE_WRITING_ENDPOINT"),
  newsletterEndpoint: getOptionalEnv("VITE_NEWSLETTER_ENDPOINT"),
} as const;

function getOptionalEnv(key: ClientEnvKey) {
  const value = import.meta.env[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}
