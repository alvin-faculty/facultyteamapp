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

export function sectionColorClass(index: number): string {
  return PALETTE[((index % PALETTE.length) + PALETTE.length) % PALETTE.length];
}
