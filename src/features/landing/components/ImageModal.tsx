import { useEffect } from "react";

import type { FloatingCard } from "../types";

export function ImageModal({ card, onClose }: { card: FloatingCard; onClose: () => void }) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="image-modal" role="dialog" aria-modal="true" aria-label={card.alt}>
      <button className="image-modal-backdrop" type="button" onClick={onClose} aria-label="Close image preview" />
      <figure className="image-modal-panel">
        <button className="image-modal-close" type="button" onClick={onClose} aria-label="Close image preview">
          ×
        </button>
        <img src={card.src} alt={card.alt} />
        <figcaption>{card.alt}</figcaption>
      </figure>
    </div>
  );
}
