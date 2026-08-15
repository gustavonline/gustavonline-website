import type { ReactNode } from "react";

import { usePageMetadata } from "../hooks/usePageMetadata";
import { useTheme } from "../hooks/useTheme";
import type { PageMetadata } from "../types";
import { Footer } from "./Footer";
import { Header } from "./Header";

export function SiteLayout({
  children,
  page,
  mainClassName = "",
}: {
  children: ReactNode;
  page: PageMetadata;
  mainClassName?: string;
}) {
  const { theme, toggleTheme } = useTheme();

  usePageMetadata(page);

  return (
    <div className="page-shell">
      <Header theme={theme} onToggleTheme={toggleTheme} />
      <main className={`main-panel ${mainClassName}`.trim()}>{children}</main>
      <Footer />
    </div>
  );
}
