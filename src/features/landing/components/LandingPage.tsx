import { useState } from "react";

import { useFloatingCards } from "../hooks/useFloatingCards";
import { usePageMetadata } from "../hooks/usePageMetadata";
import { useTheme } from "../hooks/useTheme";
import type { FloatingCard } from "../types";
import { ActionLinks } from "./ActionLinks";
import { FloatingCards } from "./FloatingCards";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { ImageModal } from "./ImageModal";
import { ProfileSection } from "./ProfileSection";

export function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const floatingCards = useFloatingCards();
  const [selectedCard, setSelectedCard] = useState<FloatingCard | null>(null);

  usePageMetadata("home");

  return (
    <div className="page-shell">
      <a className="family-skip" href="#main-content">Skip to content</a>
      <Header theme={theme} onToggleTheme={toggleTheme} />
      <FloatingCards cards={floatingCards} onSelect={setSelectedCard} />
      <main id="main-content" tabIndex={-1} className="main-panel">
        <ProfileSection />
        <ActionLinks />
      </main>
      <Footer />
      {selectedCard && <ImageModal card={selectedCard} onClose={() => setSelectedCard(null)} />}
    </div>
  );
}
