import type { CSSProperties } from "react";

import type { FloatingCard, FloatingCardView } from "../types";

const floatingCardSlots = ["slot-a", "slot-b", "slot-c", "slot-d", "slot-e", "slot-f", "slot-g", "slot-h"] as const;

export function FloatingCards({
  cards,
  onSelect,
}: {
  cards: FloatingCardView[];
  onSelect: (card: FloatingCard) => void;
}) {
  return (
    <div className="floating-card-layer" aria-label="Portfolio image cards">
      {cards.map((card, index) => (
        <button
          className={`floating-card floating-card-${floatingCardSlots[index % floatingCardSlots.length]} floating-card-kind-${card.variant}`}
          key={card.src}
          onClick={() => onSelect(card)}
          style={
            {
              "--float-rotate": card.motion.rotation,
              "--float-scale": card.motion.scale,
              "--float-x": card.motion.x,
              "--float-y": card.motion.y,
            } as CSSProperties
          }
          type="button"
        >
          <img src={card.src} alt={card.alt} />
        </button>
      ))}
    </div>
  );
}
