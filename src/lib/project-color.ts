import { clientBorderColorClass, clientColorClass } from "@/lib/client-color";

export const PROJECT_COLOR_PALETTE: { key: string; label: string; dot: string; border: string }[] = [
  { key: "red", label: "Red", dot: "bg-red-500", border: "border-l-red-500" },
  { key: "orange", label: "Orange", dot: "bg-orange-500", border: "border-l-orange-500" },
  { key: "amber", label: "Amber", dot: "bg-amber-500", border: "border-l-amber-500" },
  { key: "lime", label: "Olive", dot: "bg-lime-600", border: "border-l-lime-600" },
  { key: "green", label: "Green", dot: "bg-green-600", border: "border-l-green-600" },
  { key: "emerald", label: "Emerald", dot: "bg-emerald-600", border: "border-l-emerald-600" },
  { key: "teal", label: "Teal", dot: "bg-teal-500", border: "border-l-teal-500" },
  { key: "cyan", label: "Cyan", dot: "bg-cyan-600", border: "border-l-cyan-600" },
  { key: "sky", label: "Sky", dot: "bg-sky-600", border: "border-l-sky-600" },
  { key: "blue", label: "Blue", dot: "bg-blue-600", border: "border-l-blue-600" },
  { key: "indigo", label: "Indigo", dot: "bg-indigo-600", border: "border-l-indigo-600" },
  { key: "gray", label: "Gray", dot: "bg-gray-500", border: "border-l-gray-500" },
  { key: "violet", label: "Violet", dot: "bg-violet-600", border: "border-l-violet-600" },
  { key: "purple", label: "Purple", dot: "bg-purple-600", border: "border-l-purple-600" },
  { key: "fuchsia", label: "Fuchsia", dot: "bg-fuchsia-600", border: "border-l-fuchsia-600" },
  { key: "pink", label: "Pink", dot: "bg-pink-600", border: "border-l-pink-600" },
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
