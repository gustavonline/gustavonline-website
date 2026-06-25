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
import { WritingSection } from "./WritingSection";

export function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const floatingCards = useFloatingCards();
  const [selectedCard, setSelectedCard] = useState<FloatingCard | null>(null);

  usePageMetadata();

  return (
    <div className="page-shell">
      <Header theme={theme} onToggleTheme={toggleTheme} />
      <FloatingCards cards={floatingCards} onSelect={setSelectedCard} />
      <main className="main-panel">
        <ProfileSection />
        <ActionLinks />
        <WritingSection />
      </main>
      <Footer />
      {selectedCard && <ImageModal card={selectedCard} onClose={() => setSelectedCard(null)} />}
    </div>
  );
}
