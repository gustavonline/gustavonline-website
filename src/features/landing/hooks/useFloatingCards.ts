import { useState } from "react";

import { siteData } from "../../../site-data";
import type { FloatingCardView } from "../types";

export function useFloatingCards() {
  return useState(() => createFloatingCards(siteData.floatingCards))[0];
}

function createFloatingCards(cards: typeof siteData.floatingCards): FloatingCardView[] {
  const shuffled = [...cards];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[nextIndex]] = [shuffled[nextIndex], shuffled[index]];
  }

  return shuffled.map((card) => ({
    ...card,
    motion: {
      rotation: `${randomBetween(-3, 3)}deg`,
      scale: randomBetween(0.92, 1.08).toFixed(2),
      x: `${randomBetween(-16, 16)}px`,
      y: `${randomBetween(-58, 58)}px`,
    },
  }));
}

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
