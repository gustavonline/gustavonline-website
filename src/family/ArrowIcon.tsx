type ArrowDirection = "up-right" | "right" | "left" | "up" | "down" | "return";

const paths: Record<ArrowDirection, string> = {
  "up-right": "M4 12 12 4M4 4h8v8",
  right: "M3 8h10M8 3l5 5-5 5",
  left: "M13 8H3m5-5L3 8l5 5",
  up: "M8 13V3m-5 5 5-5 5 5",
  down: "M8 3v10m-5-5 5 5 5-5",
  return: "M3 7h6a4 4 0 0 1 0 8M3 7l4-4M3 7l4 4",
};

export function ArrowIcon({ direction = "up-right" }: { direction?: ArrowDirection }) {
  return (
    <svg
      className="ui-arrow"
      width="1em"
      height="1em"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{ display: "inline-block", width: "1em", height: "1em", verticalAlign: "-0.125em", flexShrink: 0 }}
    >
      <path d={paths[direction]} />
    </svg>
  );
}
