import { useState } from "react";

import { siteData } from "../../../site-data";
import type { FloatingCardView } from "../types";

export function useFloatingCards() {
  return useState(() => createFloatingCards(siteData.floatingCards))[0];
}

function createFloatingCards(cards: typeof siteData.floatingCards): FloatingCardView[] {
  const shuffledCards = [...cards];

  for (let index = shuffledCards.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffledCards[index], shuffledCards[randomIndex]] = [shuffledCards[randomIndex], shuffledCards[index]];
  }

  return shuffledCards.map((card) => ({
    ...card,
    motion: {
      rotation: "0deg",
      scale: "1",
      x: `${randomIntegerBetween(-10, 10)}px`,
      y: `${randomIntegerBetween(-8, 8)}px`,
    },
  }));
}

function randomIntegerBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
