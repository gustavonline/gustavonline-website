import { Link } from "@tanstack/react-router";

import { siteData } from "../../../site-data";
import type { Theme } from "../types";

export function Header({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  const identityMark = getRouteAssetPath(siteData.identityMark);

  return (
    <header className="site-header">
      <Link className="brand-link" to="/" aria-label={`${siteData.brand} home`}>
        <img className="header-mark" src={identityMark} alt="" aria-hidden="true" />
        <span>{siteData.navBrand}</span>
      </Link>
      <Link className="header-newsletter-link" to="/newsletter">Newsletter</Link>
      <button className="theme-toggle" type="button" onClick={onToggleTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`} aria-pressed={theme === "dark"}>
        <span className="theme-toggle-icon" aria-hidden="true" />
      </button>
    </header>
  );
}

function getRouteAssetPath(assetPath: string) {
  const normalizedAssetPath = assetPath.replace(/^\/+/, "");
  const pathname = window.location.pathname;
  const basePath =
    pathname === "/gustavonline" || pathname.startsWith("/gustavonline/")
      ? "/gustavonline"
      : "";

  if (import.meta.env.DEV) {
    return `/${normalizedAssetPath}`;
  }

  return `${basePath}/${normalizedAssetPath}`;
}
