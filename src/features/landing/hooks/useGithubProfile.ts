import { useEffect, useState } from "react";

import bundledProfile from "../../../../public/data/github-profile.json";
import { clientEnv } from "../../../config/client-env";
import { parseGithubProfile, preferProfile, type GithubProfile } from "../githubProfile";

const SNAPSHOT_URL = `${import.meta.env.BASE_URL}data/github-profile.json`;
const REMOTE_URL = "https://raw.githubusercontent.com/gustavonline/gustavonline/main/data/github-profile.json";
const BUNDLED_PROFILE = parseGithubProfile(bundledProfile);

/**
 * The GitHub profile projection. The bundled snapshot (generated from the profile
 * and project READMEs) is bundled too, so the first render and offline copy use the
 * same content rather than a second hand-written fallback. Only when
 * VITE_GITHUB_PROFILE_REFRESH=true does it also try the public profile repository;
 * `preferProfile` decides (a newer schema wins, so an older remote schema never
 * replaces a newer snapshot). Any failure keeps the valid snapshot. No tokens are
 * used. Returns null when no valid data exists.
 */
export function useGithubProfile() {
  const [profile, setProfile] = useState<GithubProfile | null>(BUNDLED_PROFILE);

  useEffect(() => {
    const controller = new AbortController();
    const load = async (url: string) => {
      try {
        const response = await fetch(url, { signal: controller.signal, credentials: "omit", cache: "no-cache" });
        return response.ok ? parseGithubProfile(await response.json()) : null;
      } catch {
        return null;
      }
    };

    void (async () => {
      const snapshot = preferProfile(BUNDLED_PROFILE, await load(SNAPSHOT_URL));
      if (controller.signal.aborted) return;
      if (snapshot) setProfile(snapshot);
      if (!clientEnv.githubProfileRefresh) return;
      const remote = await load(REMOTE_URL);
      if (controller.signal.aborted) return;
      const preferred = preferProfile(snapshot, remote);
      if (preferred && preferred !== snapshot) setProfile(preferred);
    })();

    return () => controller.abort();
  }, []);

  return profile;
}
