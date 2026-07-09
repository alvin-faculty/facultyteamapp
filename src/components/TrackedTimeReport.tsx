"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { profileColorClass } from "@/lib/profile-color";
import { projectDotColorClass } from "@/lib/project-color";
import { formatCurrency, formatDurationBetween, formatMinutes, formatTimeOfDay } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface TrackedEntry {
  id: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  billable: boolean;
  rate_snapshot: number;
  description: string | null;
  user_id: string;
  user_name: string;
  project_id: string;
  project_name: string;
  project_color: string | null;
  client_id: string | null;
  task_id: string | null;
  task_title: string | null;
}

interface TeamMember {
  id: string;
  name: string;
}

type RangeKey = "today" | "week" | "month" | "all";

const RANGE_LABELS: Record<RangeKey, string> = {
  today: "Today",
  week: "This week",
  month: "This month",
  all: "All time",
};

function rangeStart(range: RangeKey): Date | null {
  const now = new Date();
  if (range === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (range === "week") {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.getFullYear(), now.getMonth(), diff);
  }
  if (range === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  return null;
}

function entryAmount(entry: TrackedEntry): number {
  if (!entry.billable) return 0;
  return ((entry.duration_minutes ?? 0) / 60) * entry.rate_snapshot;
}

function dayKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayLabel(dateStr: string): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric" }).format(
    new Date(dateStr),
  );
}

function shortDayLabel(dateStr: string): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(
    new Date(dateStr),
  );
}

interface GroupedEntry {
  key: string;
  user_id: string;
  user_name: string;
  project_id: string;
  project_name: string;
  task_id: string | null;
  task_title: string | null;
  description: string | null;
  billable: boolean;
  minutes: number;
  amount: number;
  count: number;
  earliestStart: string;
  latestEnd: string | null;
}

function groupEntries(dayEntries: TrackedEntry[]): GroupedEntry[] {
  const map = new Map<string, GroupedEntry>();
  for (const e of dayEntries) {
    const key = `${e.user_id}|${e.project_id}|${e.task_id ?? ""}`;
    const existing = map.get(key);
    if (existing) {
      existing.minutes += e.duration_minutes ?? 0;
      existing.amount += entryAmount(e);
      existing.count += 1;
      existing.billable = existing.billable || e.billable;
      if (e.started_at < existing.earliestStart) existing.earliestStart = e.started_at;
      if (e.ended_at && (!existing.latestEnd || e.ended_at > existing.latestEnd)) existing.latestEnd = e.ended_at;
      if (existing.description !== e.description) existing.description = null;
    } else {
      map.set(key, {
        key,
        user_id: e.user_id,
        user_name: e.user_name,
        project_id: e.project_id,
        project_name: e.project_name,
        task_id: e.task_id,
        task_title: e.task_title,
        description: e.description,
        billable: e.billable,
        minutes: e.duration_minutes ?? 0,
        amount: entryAmount(e),
        count: 1,
        earliestStart: e.started_at,
        latestEnd: e.ended_at,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.earliestStart.localeCompare(a.earliestStart));
}

function BarRow({
  colorClass,
  label,
  minutes,
  amount,
  pct,
}: {
  colorClass: string;
  label: string;
  minutes: number;
  amount: number;
  pct: number;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className={cn("size-2 shrink-0 rounded-full", colorClass)} />
          <span className="truncate">{label}</span>
        </span>
        <span className="shrink-0 text-muted-foreground">
          {formatMinutes(minutes)}
          {amount > 0 && <> · {formatCurrency(amount)}</>}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", colorClass)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function TrackedTimeReport({
  entries,
  teamMembers,
}: {
  entries: TrackedEntry[];
  teamMembers: TeamMember[];
}) {
  const router = useRouter();
  const [range, setRange] = useState<RangeKey>("week");

  const filtered = useMemo(() => {
    const start = rangeStart(range);
    if (!start) return entries;
    return entries.filter((e) => new Date(e.started_at) >= start);
  }, [entries, range]);

  const totalMinutes = filtered.reduce((sum, e) => sum + (e.duration_minutes ?? 0), 0);
  const totalAmount = filtered.reduce((sum, e) => sum + entryAmount(e), 0);

  const byProject = useMemo(() => {
    const map = new Map<string, { name: string; color: string | null; minutes: number; amount: number }>();
    for (const e of filtered) {
      const entry = map.get(e.project_id) ?? { name: e.project_name, color: e.project_color, minutes: 0, amount: 0 };
      entry.minutes += e.duration_minutes ?? 0;
      entry.amount += entryAmount(e);
      map.set(e.project_id, entry);
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [filtered]);

  const byPerson = useMemo(() => {
    const map = new Map<string, { name: string; minutes: number; amount: number }>();
    for (const e of filtered) {
      const entry = map.get(e.user_id) ?? { name: e.user_name, minutes: 0, amount: 0 };
      entry.minutes += e.duration_minutes ?? 0;
      entry.amount += entryAmount(e);
      map.set(e.user_id, entry);
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [filtered]);

  const byDay = useMemo(() => {
    const map = new Map<string, TrackedEntry[]>();
    for (const e of filtered) {
      const key = dayKey(e.started_at);
      (map.get(key) ?? map.set(key, []).get(key)!).push(e);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const dailySummary = useMemo(() => {
    const perDayPerUser = new Map<string, Map<string, number>>();
    for (const [day, dayEntries] of byDay) {
      const perUser = new Map<string, number>();
      for (const e of dayEntries) {
        perUser.set(e.user_id, (perUser.get(e.user_id) ?? 0) + (e.duration_minutes ?? 0));
      }
      perDayPerUser.set(day, perUser);
    }
    return perDayPerUser;
  }, [byDay]);

  const memberTotals = useMemo(() => {
    return teamMembers.map((m) => ({
      ...m,
      minutes: Array.from(dailySummary.values()).reduce((sum, perUser) => sum + (perUser.get(m.id) ?? 0), 0),
    }));
  }, [teamMembers, dailySummary]);

  const maxProjectMinutes = byProject[0]?.minutes ?? 0;
  const maxPersonMinutes = byPerson[0]?.minutes ?? 0;

  return (
    <div className="col-span-12 space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Tracked Time</h1>
        <Select value={range} onValueChange={(v) => setRange((v as RangeKey) ?? "week")} items={RANGE_LABELS}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(RANGE_LABELS) as RangeKey[]).map((key) => (
              <SelectItem key={key} value={key}>
                {RANGE_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">Total time</p>
          <p className="mt-1 text-2xl font-semibold">{formatMinutes(totalMinutes)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">Billable</p>
          <p className="mt-1 text-2xl font-semibold">{formatCurrency(totalAmount)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">Entries</p>
          <p className="mt-1 text-2xl font-semibold">{filtered.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-3 rounded-xl border bg-card p-4">
          <p className="text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">By project</p>
          {byProject.length === 0 && <p className="text-sm text-muted-foreground">No tracked time yet.</p>}
          <div className="space-y-3">
            {byProject.map((p) => (
              <BarRow
                key={p.id}
                colorClass={projectDotColorClass(p.color, null)}
                label={p.name}
                minutes={p.minutes}
                amount={p.amount}
                pct={maxProjectMinutes > 0 ? (p.minutes / maxProjectMinutes) * 100 : 0}
              />
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-xl border bg-card p-4">
          <p className="text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">By team member</p>
          {byPerson.length === 0 && <p className="text-sm text-muted-foreground">No tracked time yet.</p>}
          <div className="space-y-3">
            {byPerson.map((p) => (
              <BarRow
                key={p.id}
                colorClass={profileColorClass(p.id)}
                label={p.name}
                minutes={p.minutes}
                amount={p.amount}
                pct={maxPersonMinutes > 0 ? (p.minutes / maxPersonMinutes) * 100 : 0}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">
          Tracked Time Summary
        </p>
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="px-4 py-2 text-left font-medium">Day</th>
                {teamMembers.map((m) => (
                  <th key={m.id} className="px-4 py-2 text-right font-medium whitespace-nowrap">
                    <span className="flex items-center justify-end gap-1.5">
                      <span className={cn("size-2 rounded-full", profileColorClass(m.id))} />
                      {m.name}
                    </span>
                  </th>
                ))}
                <th className="px-4 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {byDay.length === 0 && (
                <tr>
                  <td colSpan={teamMembers.length + 2} className="px-4 py-4 text-center text-sm text-muted-foreground">
                    No tracked time in this range.
                  </td>
                </tr>
              )}
              {byDay.map(([day]) => {
                const perUser = dailySummary.get(day) ?? new Map<string, number>();
                const dayTotal = Array.from(perUser.values()).reduce((sum, m) => sum + m, 0);
                return (
                  <tr key={day} className="border-b last:border-0">
                    <td className="px-4 py-2 whitespace-nowrap">{shortDayLabel(day)}</td>
                    {teamMembers.map((m) => {
                      const minutes = perUser.get(m.id) ?? 0;
                      return (
                        <td key={m.id} className="px-4 py-2 text-right text-muted-foreground">
                          {minutes > 0 ? formatMinutes(minutes) : "—"}
                        </td>
                      );
                    })}
                    <td className="px-4 py-2 text-right font-medium">{formatMinutes(dayTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
            {byDay.length > 0 && (
              <tfoot>
                <tr className="border-t bg-muted/30">
                  <td className="px-4 py-2 font-medium">Total</td>
                  {memberTotals.map((m) => (
                    <td key={m.id} className="px-4 py-2 text-right font-medium">
                      {m.minutes > 0 ? formatMinutes(m.minutes) : "—"}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-right font-semibold">{formatMinutes(totalMinutes)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">Entries</p>
        {byDay.length === 0 && <p className="text-sm text-muted-foreground">No tracked time in this range.</p>}
        {byDay.map(([day, dayEntries]) => {
          const dayMinutes = dayEntries.reduce((sum, e) => sum + (e.duration_minutes ?? 0), 0);
          const grouped = groupEntries(dayEntries);
          return (
            <div key={day} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{dayLabel(day)}</span>
                <span>{formatMinutes(dayMinutes)}</span>
              </div>
              <div className="divide-y rounded-xl border bg-card">
                {grouped.map((e) => (
                  <div
                    key={e.key}
                    onClick={() =>
                      router.push(
                        e.task_id
                          ? `/projects/${e.project_id}?task=${e.task_id}`
                          : `/projects/${e.project_id}`,
                      )
                    }
                    className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted/40"
                  >
                    <span className={cn("size-2 shrink-0 rounded-full", profileColorClass(e.user_id))} />
                    <span className="w-24 shrink-0 truncate text-muted-foreground">{e.user_name}</span>
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-medium">{e.project_name}</span>
                      {e.task_title && <span className="text-muted-foreground"> · {e.task_title}</span>}
                      {e.count === 1 && e.description && (
                        <span className="text-muted-foreground"> — {e.description}</span>
                      )}
                      {e.count > 1 && (
                        <span className="text-muted-foreground"> · {e.count} sessions</span>
                      )}
                    </span>
                    {!e.billable && (
                      <span className="shrink-0 rounded-full bg-muted px-1.5 py-px text-[9px] text-muted-foreground uppercase">
                        Non-billable
                      </span>
                    )}
                    <span className="hidden shrink-0 whitespace-nowrap text-xs text-muted-foreground sm:inline">
                      {formatTimeOfDay(e.earliestStart)}
                      {e.latestEnd && <> – {formatTimeOfDay(e.latestEnd)}</>}
                    </span>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      {e.count === 1 && e.latestEnd
                        ? formatDurationBetween(e.earliestStart, e.latestEnd)
                        : formatMinutes(e.minutes)}
                    </span>
                    <span className="w-20 shrink-0 text-right font-medium">
                      {e.billable && e.amount > 0 ? formatCurrency(e.amount) : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
