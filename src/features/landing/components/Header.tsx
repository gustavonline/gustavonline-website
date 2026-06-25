import { Moon, Sun } from "lucide-react";

import { siteData } from "../../../site-data";
import type { Theme } from "../types";

export function Header({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  const homeHref = window.location.pathname.startsWith("/gustavonline") ? "/gustavonline/" : "/";

  return (
    <header className="site-header">
      <a className="logo-link" href={homeHref} aria-label={`${siteData.brand} home`}>
        <img src={siteData.logo} alt="" />
      </a>
      <a className="brand-link" href={homeHref} aria-label={`${siteData.brand} home`}>
        {siteData.navBrand}
      </a>
      <button className="theme-toggle" type="button" onClick={onToggleTheme} aria-label="Toggle light and dark mode">
        {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
      </button>
    </header>
  );
}
