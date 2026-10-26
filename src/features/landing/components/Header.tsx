import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { familyHref } from "../../../family/preview";
import { siteData } from "../../../site-data";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useNavigationOverlay } from "../hooks/useNavigationOverlay";
import type { Theme } from "../types";

/** Matches the compact-header breakpoint in src/family/site.css. */
const COMPACT_HEADER = "(max-width: 760px)";
const MENU_ID = "site-menu";

/* The compact header opens a full-viewport navigation dialog. Ordinary links keep
 * their navigation semantics, while the overlay locks scrolling and background focus. */
export function Header({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  const identityMark = getRouteAssetPath(siteData.identityMark);
  const compact = useMediaQuery(COMPACT_HEADER);
  const [menuOpen, setMenuOpen] = useState(false);
  const expanded = compact && menuOpen;
  const overlayRef = useRef<HTMLDivElement>(null);
  useNavigationOverlay(expanded, overlayRef);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const focusWork = useRef(window.location.hash === "#selected-work");
  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    if (expanded || !focusWork.current) return;
    const request = requestAnimationFrame(() => {
      const target = document.getElementById("selected-work");
      if (!target) return;
      focusWork.current = false;
      target.tabIndex = -1;
      target.scrollIntoView({ block: "start", behavior: "smooth" });
      target.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(request);
  }, [expanded]);

  useEffect(() => {
    if (!compact) setMenuOpen(false);
  }, [compact]);

  useEffect(() => {
    if (!expanded) return;
    const inside = (target: EventTarget | null) =>
      target instanceof Node && Boolean(overlayRef.current?.contains(target));
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      toggleRef.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!inside(event.target)) setMenuOpen(false);
    };
    const onFocusIn = (event: FocusEvent) => {
      if (!inside(event.target)) setMenuOpen(false);
    };
    const onPopState = () => setMenuOpen(false);
    window.addEventListener("popstate", onPopState);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, { passive: true });
    document.addEventListener("focusin", onFocusIn);
    return () => {
      window.removeEventListener("popstate", onPopState);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [expanded]);

  return (
    <header className="site-header">
      <div className="navigation-overlay" ref={overlayRef} role={expanded ? "dialog" : undefined} aria-modal={expanded ? true : undefined} aria-label={expanded ? "Site navigation" : undefined}>
      <Link className="brand-link" to="/" aria-label={`${siteData.brand} home`} onClick={closeMenu}>
        <img className="header-mark" src={identityMark} alt="" aria-hidden="true" />
        <span>{siteData.navBrand}</span>
      </Link>
      <Link className="header-newsletter-link" to="/newsletter">Newsletter</Link>
      <button className="theme-toggle" type="button" onClick={onToggleTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`} aria-pressed={theme === "dark"}>
        <span className="theme-toggle-icon" aria-hidden="true" />
      </button>
      <button
        ref={toggleRef}
        className="menu-toggle"
        type="button"
        aria-label={expanded ? "Close menu" : "Open menu"}
        aria-expanded={expanded}
        aria-controls={MENU_ID}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span className="menu-toggle-icon" aria-hidden="true"><span /></span>
      </button>
      <nav ref={panelRef} id={MENU_ID} className="site-menu" aria-label="Site" hidden={!expanded}>
        <p className="site-menu-label" id="site-menu-family">Other sites</p>
        <ul className="site-menu-family" aria-labelledby="site-menu-family">
          <li>
            <a href={familyHref("onlinesourdough")} target="_blank" rel="noopener noreferrer" onClick={closeMenu}>
              <span className="brand-name-token" data-brand-name="onlinesourdough">onlinesourdough</span> <span aria-hidden="true">↗</span>
            </a>
          </li>
          <li>
            <a href={familyHref("arcitai")} target="_blank" rel="noopener noreferrer" onClick={closeMenu}>
              <span className="brand-name-token" data-brand-name="arcitai">Arc’IT AI</span> <span aria-hidden="true">↗</span>
            </a>
          </li>
        </ul>
        <ul className="site-menu-links">
          <li>
            <Link to="/" activeOptions={{ exact: true, includeHash: true }} onClick={closeMenu}>Home</Link>
          </li>
          <li>
            <Link to="/" hash="selected-work" activeOptions={{ exact: true, includeHash: true }} onClick={() => { focusWork.current = true; closeMenu(); }}>{siteData.selectedWork.title}</Link>
          </li>
          <li>
            <Link to="/newsletter" activeOptions={{ exact: true }} onClick={closeMenu}>Newsletter</Link>
          </li>
        </ul>
      </nav>
      </div>
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
