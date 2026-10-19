import { useState, type FocusEvent, type PointerEvent, type SyntheticEvent } from "react";

import { useGithubProfile } from "../hooks/useGithubProfile";
import { useLandingPreview } from "../hooks/useLandingLayout";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { usePageMetadata } from "../hooks/usePageMetadata";
import { useTheme } from "../hooks/useTheme";
import { ActionLinks } from "./ActionLinks";
import { markBrands, type MarkBrand } from "./brandMarks";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { PixelField } from "./PixelField";
import { ProfileSection } from "./ProfileSection";
import { SelectedWork } from "./SelectedWork";

/** The brand of the project row under the pointer or keyboard focus, if any. */
function brandFromEvent(event: SyntheticEvent): MarkBrand | null {
  const brand = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-brand]")?.dataset.brand : undefined;
  return markBrands.find((item) => item === brand) ?? null;
}

export function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  // The owner chose Top + Reveal (the defaults); older preview URLs still resolve by direct link.
  const { layout, motion } = useLandingPreview();
  const wideLeft = useMediaQuery("(min-width: 1100px)");
  // Two separate cues so neither can stick: a mouse over a project, and keyboard focus
  // on a project. Focus from a mouse click (not :focus-visible) does not cue the field.
  const [hoverCue, setHoverCue] = useState<MarkBrand | null>(null);
  const [focusCue, setFocusCue] = useState<MarkBrand | null>(null);
  const highlight = hoverCue ?? focusCue;
  const onPointerOver = (event: PointerEvent) => {
    if (event.pointerType !== "touch") setHoverCue(brandFromEvent(event));
  };
  const onFocus = (event: FocusEvent) => {
    setFocusCue(event.target instanceof Element && event.target.matches(":focus-visible") ? brandFromEvent(event) : null);
  };
  const profile = useGithubProfile();
  const contributions = profile?.contributions ?? null;
  const inlineTop = layout === "top" || (layout === "left" && !wideLeft);

  usePageMetadata("home");

  return (
    <div className={`page-shell landing-page landing-layout-${layout}`}>
      <a className="family-skip" href="#main-content">Skip to content</a>
      <Header theme={theme} onToggleTheme={toggleTheme} />
      {layout === "left" && wideLeft && <PixelField theme={theme} placement="side" motion={motion} contributions={contributions} highlight={highlight} />}
      <main
        id="main-content"
        tabIndex={-1}
        className="main-panel landing-main"
        onPointerOver={onPointerOver}
        onPointerLeave={() => setHoverCue(null)}
        onPointerDown={() => setFocusCue(null)}
        onFocus={onFocus}
        onBlur={() => setFocusCue(null)}
      >
        {inlineTop && <PixelField theme={theme} placement="top" motion={motion} contributions={contributions} highlight={highlight} />}
        <ProfileSection />
        {layout === "profile" && <PixelField theme={theme} placement="top" motion={motion} contributions={contributions} highlight={highlight} />}
        <ActionLinks />
        <SelectedWork profile={profile} />
      </main>
      <Footer />
    </div>
  );
}
