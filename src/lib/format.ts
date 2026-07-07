export function formatMinutes(minutes: number | null): string {
  if (!minutes) return "0h 00m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  // dateStr is a bare "YYYY-MM-DD" date with no time component. JS parses that as
  // UTC midnight, so formatting must stay in UTC too or the day shifts by one in
  // timezones behind UTC.
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(dateStr));
}

export function minutesBetween(start: string, end: string): number {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
}

/** Today as "YYYY-MM-DD" using local calendar date parts, not toISOString()
 * (which reports the date in UTC and can be off by one near midnight). */
export function todayISODate(from: Date = new Date()): string {
  const year = from.getFullYear();
  const month = String(from.getMonth() + 1).padStart(2, "0");
  const day = String(from.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
