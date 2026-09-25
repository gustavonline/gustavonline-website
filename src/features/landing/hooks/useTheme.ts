import { useEffect, useState } from "react";

import { siteData } from "../../../site-data";
import type { Theme } from "../types";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    const requested = new URLSearchParams(window.location.search).get("theme");
    if (requested === "light" || requested === "dark") return requested;
    try {
      const saved = window.localStorage.getItem(siteData.themeStorageKey);
      if (saved === "dark" || saved === "light") return saved;
    } catch { /* Storage is optional. */ }
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { window.localStorage.setItem(siteData.themeStorageKey, theme); } catch { /* Storage is optional. */ }
  }, [theme]);

  return {
    theme,
    toggleTheme: () => setTheme((currentTheme) => (currentTheme === "light" ? "dark" : "light")),
  };
}
