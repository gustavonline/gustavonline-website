import type { FamilyBrand } from "./preview";

// Matches the canonical onlinesourdough large-pixel-v3 mark, using currentColor for each site.
const boule = [
  "0001111000",
  "0111111110",
  "1110110110",
  "1101101101",
  "1111111111",
  "1111111111",
  "0111111110",
];

export function FamilyMark({ brand }: { brand: FamilyBrand }) {
  if (brand === "gustavonline")
    return (
      <img
        className="family-portrait"
        src="/assets/gustav-linkedin-portrait.jpg"
        width="28"
        height="28"
        alt=""
      />
    );
  if (brand === "onlinesourdough")
    return (
      <svg
        className="family-mark family-mark-bread"
        viewBox="0 0 10 7"
        aria-hidden="true"
      >
        {boule.flatMap((row, y) =>
          [...row].map((cell, x) =>
            cell === "1" ? (
              <rect
                key={y * 10 + x}
                x={x + 0.09}
                y={y + 0.09}
                width=".82"
                height=".82"
              />
            ) : null,
          ),
        )}
      </svg>
    );
  return (
    <svg
      className="family-mark family-mark-arcit"
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <rect x="1" y="1" width="98" height="98" rx="16" fill="#4265a0" />
      <g
        transform="translate(15 22) scale(1.1)"
        fill="#fff"
        stroke="#fff"
        strokeWidth=".65"
      >
        <path d="M26 2h14l-6 14H20Z" />
        <path d="M19 18h14l-6 14H13Z" />
        <path d="M12 34h14l-6 14H6Z" />
        <rect x="42" y="2" width="14" height="14" />
        <rect x="36" y="18" width="14" height="14" />
        <rect x="48" y="34" width="14" height="14" />
      </g>
    </svg>
  );
}
