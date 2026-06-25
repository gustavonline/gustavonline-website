import { useEffect, useState } from "react";

import { siteData } from "../../../site-data";
import type { Theme } from "../types";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    return window.localStorage.getItem(siteData.themeStorageKey) === "dark" ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(siteData.themeStorageKey, theme);
  }, [theme]);

  return {
    theme,
    toggleTheme: () => setTheme((currentTheme) => (currentTheme === "light" ? "dark" : "light")),
  };
}
