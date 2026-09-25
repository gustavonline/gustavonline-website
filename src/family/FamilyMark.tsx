import type { FamilyBrand } from "./preview";

// Original pixel-boule silhouette and score cuts; even gutters remain visible at small sizes.
const boule = [
  "0001111000", "0111111110", "1110110110", "1101101101",
  "1111111111", "1111111111", "0111111110",
];

export function FamilyMark({ brand }: { brand: FamilyBrand }) {
  if (brand === "gustavonline")
    return <img className="family-portrait" src="/assets/gustav-portrait.jpg" width="28" height="28" alt="" />;
  if (brand === "onlinesourdough")
    return <svg className="family-mark family-mark-bread" viewBox="0 0 10 7" aria-hidden="true">
      {boule.flatMap((row, y) => [...row].map((cell, x) =>
        cell === "1" ? <rect key={y * 10 + x} x={x + .125} y={y + .125} width=".75" height=".75" /> : null
      ))}
    </svg>;
  return <svg className="family-mark family-mark-arcit" viewBox="4 -4 60 60" aria-hidden="true">
    <path d="M26 2h14l-6 14H20ZM19 18h14l-6 14H13ZM12 34h14l-6 14H6Z" />
    <rect x="42" y="2" width="14" height="14" />
    <rect x="36" y="18" width="14" height="14" />
    <rect x="48" y="34" width="14" height="14" />
  </svg>;
}
