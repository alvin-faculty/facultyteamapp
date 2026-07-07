const PALETTE = [
  "bg-red-400",
  "bg-orange-400",
  "bg-amber-400",
  "bg-emerald-400",
  "bg-teal-400",
  "bg-blue-400",
  "bg-indigo-400",
  "bg-pink-400",
];

// Parallel palette for card left-accent stripes (Tailwind needs literal class names).
const BORDER_PALETTE = [
  "border-l-red-400",
  "border-l-orange-400",
  "border-l-amber-400",
  "border-l-emerald-400",
  "border-l-teal-400",
  "border-l-blue-400",
  "border-l-indigo-400",
  "border-l-pink-400",
];

function clientHash(clientId: string): number {
  let hash = 0;
  for (let i = 0; i < clientId.length; i++) {
    hash = (hash * 31 + clientId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** Deterministic color for a client, based on its id, so the same client always gets the same dot. */
export function clientColorClass(clientId: string): string {
  return PALETTE[clientHash(clientId) % PALETTE.length];
}

export function clientBorderColorClass(clientId: string): string {
  return BORDER_PALETTE[clientHash(clientId) % BORDER_PALETTE.length];
}
