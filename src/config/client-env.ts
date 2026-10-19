type ClientEnvKey = "VITE_WRITING_ENDPOINT" | "VITE_NEWSLETTER_ENDPOINT" | "VITE_GITHUB_PROFILE_REFRESH";

export const clientEnv = {
  writingEndpoint: getOptionalEnv("VITE_WRITING_ENDPOINT"),
  newsletterEndpoint: getOptionalEnv("VITE_NEWSLETTER_ENDPOINT"),
  /** Opt-in only: refresh the bundled GitHub profile snapshot from the public profile repository. */
  githubProfileRefresh: getOptionalEnv("VITE_GITHUB_PROFILE_REFRESH") === "true",
} as const;

function getOptionalEnv(key: ClientEnvKey) {
  const value = import.meta.env[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}
