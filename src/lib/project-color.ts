import { clientBorderColorClass, clientColorClass } from "@/lib/client-color";

export const PROJECT_COLOR_PALETTE: { key: string; label: string; dot: string; border: string }[] = [
  { key: "red", label: "Red", dot: "bg-red-400", border: "border-l-red-400" },
  { key: "orange", label: "Orange", dot: "bg-orange-400", border: "border-l-orange-400" },
  { key: "amber", label: "Amber", dot: "bg-amber-400", border: "border-l-amber-400" },
  { key: "emerald", label: "Emerald", dot: "bg-emerald-400", border: "border-l-emerald-400" },
  { key: "teal", label: "Teal", dot: "bg-teal-400", border: "border-l-teal-400" },
  { key: "blue", label: "Blue", dot: "bg-blue-400", border: "border-l-blue-400" },
  { key: "indigo", label: "Indigo", dot: "bg-indigo-400", border: "border-l-indigo-400" },
  { key: "pink", label: "Pink", dot: "bg-pink-400", border: "border-l-pink-400" },
];

/** Project's custom color if set, else the deterministic per-client color, else a neutral default. */
export function projectDotColorClass(color: string | null, clientId: string | null): string {
  const custom = PROJECT_COLOR_PALETTE.find((c) => c.key === color);
  if (custom) return custom.dot;
  return clientId ? clientColorClass(clientId) : "bg-muted-foreground";
}

export function projectBorderColorClass(color: string | null, clientId: string | null): string {
  const custom = PROJECT_COLOR_PALETTE.find((c) => c.key === color);
  if (custom) return custom.border;
  return clientId ? clientBorderColorClass(clientId) : "border-l-muted-foreground";
}
