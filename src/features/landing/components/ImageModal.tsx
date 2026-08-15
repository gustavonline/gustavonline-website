import { useEffect, useRef } from "react";

import type { FloatingCard } from "../types";

export function ImageModal({ card, onClose }: { card: FloatingCard; onClose: () => void }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    closeButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (previouslyFocused?.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, [onClose]);

  return (
    <div className="image-modal" role="dialog" aria-modal="true" aria-label={card.alt}>
      <button className="image-modal-backdrop" type="button" onClick={onClose} aria-label="Close image preview" />
      <figure className="image-modal-panel">
        <button
          ref={closeButtonRef}
          className="image-modal-close"
          type="button"
          onClick={onClose}
          aria-label="Close image preview"
        >
          ×
        </button>
        <img src={card.src} alt={card.alt} />
        <figcaption>{card.alt}</figcaption>
      </figure>
    </div>
  );
}
