import type { ReactNode } from "react";

import { usePageMetadata } from "../hooks/usePageMetadata";
import { useTheme } from "../hooks/useTheme";
import type { PageMetadata, Theme } from "../types";
import { Footer } from "./Footer";
import { Header } from "./Header";

type SiteLayoutChildren = ReactNode | ((theme: Theme) => ReactNode);

export function SiteLayout({
  children,
  page,
  mainClassName = "",
}: {
  children: SiteLayoutChildren;
  page: PageMetadata;
  mainClassName?: string;
}) {
  const { theme, toggleTheme } = useTheme();

  usePageMetadata(page);

  const content = typeof children === "function" ? children(theme) : children;

  return (
    <div className="page-shell">
      <a className="family-skip" href="#main-content">Skip to content</a>
      <Header theme={theme} onToggleTheme={toggleTheme} />
      <main id="main-content" tabIndex={-1} className={`main-panel ${mainClassName}`.trim()}>{content}</main>
      <Footer />
    </div>
  );
}
