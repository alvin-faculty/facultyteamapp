const PALETTE = [
  "bg-orange-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-purple-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-cyan-500",
  "bg-fuchsia-500",
];

// Parallel palette for card left-accent stripes (Tailwind needs literal class names).
const BORDER_PALETTE = [
  "border-l-orange-500",
  "border-l-blue-500",
  "border-l-emerald-500",
  "border-l-purple-500",
  "border-l-rose-500",
  "border-l-amber-500",
  "border-l-cyan-500",
  "border-l-fuchsia-500",
];

export function sectionColorClass(index: number): string {
  return PALETTE[((index % PALETTE.length) + PALETTE.length) % PALETTE.length];
}

export function sectionBorderColorClass(index: number): string {
  return BORDER_PALETTE[((index % BORDER_PALETTE.length) + BORDER_PALETTE.length) % BORDER_PALETTE.length];
}
