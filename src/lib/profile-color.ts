// Per-user dot colors, ShiftNotes-style (amber-600 for the first user, etc.).
const PALETTE = [
  "bg-amber-600",
  "bg-emerald-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-teal-500",
];

/** Deterministic color for a user, based on their id, so the same person always gets the same dot. */
export function profileColorClass(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}
