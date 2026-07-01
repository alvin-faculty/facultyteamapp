"use client";

import { useTransition } from "react";
import { markInvoiced } from "@/lib/actions/billing";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate, formatMinutes } from "@/lib/format";
import { Download } from "lucide-react";
import { toast } from "sonner";
import type { TimeEntry } from "@/lib/supabase/types";

type BillingEntry = TimeEntry & {
  profiles: { name: string } | null;
  projects: { name: string } | null;
};

export function BillingResults({
  entries,
  clientId,
  clientName,
  projectId,
  startDate,
  endDate,
}: {
  entries: BillingEntry[];
  clientId: string;
  clientName: string;
  projectId: string | null;
  startDate: string;
  endDate: string;
}) {
  const [isPending, startTransition] = useTransition();

  const totalMinutes = entries.reduce((sum, e) => sum + (e.duration_minutes ?? 0), 0);
  const totalAmount = entries.reduce(
    (sum, e) => sum + ((e.duration_minutes ?? 0) / 60) * e.rate_snapshot,
    0,
  );
  const allLocked = entries.length > 0 && entries.every((e) => e.locked);

  function exportCsv() {
    const header = ["Date", "Project", "Person", "Description", "Hours", "Rate", "Amount"];
    const rows = entries.map((e) => {
      const hours = (e.duration_minutes ?? 0) / 60;
      return [
        e.started_at.slice(0, 10),
        e.projects?.name ?? "",
        e.profiles?.name ?? "",
        (e.description ?? "").replace(/"/g, '""'),
        hours.toFixed(2),
        e.rate_snapshot.toFixed(2),
        (hours * e.rate_snapshot).toFixed(2),
      ];
    });
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${clientName.replace(/\s+/g, "-")}_${startDate}_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {entries.length} entries · {formatMinutes(totalMinutes)} · {formatCurrency(totalAmount)}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv} disabled={entries.length === 0}>
            <Download className="size-4" />
            Export CSV
          </Button>
          <Button
            disabled={entries.length === 0 || allLocked || isPending}
            onClick={() =>
              startTransition(async () => {
                await markInvoiced(clientId, projectId, startDate, endDate);
                toast.success("Entries marked as invoiced and locked");
              })
            }
          >
            {allLocked ? "Already invoiced" : "Mark as invoiced"}
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Person</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Hours</TableHead>
            <TableHead>Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((e) => (
            <TableRow key={e.id}>
              <TableCell>{formatDate(e.started_at.slice(0, 10))}</TableCell>
              <TableCell>{e.projects?.name}</TableCell>
              <TableCell>{e.profiles?.name}</TableCell>
              <TableCell className="max-w-64 truncate">{e.description}</TableCell>
              <TableCell>{formatMinutes(e.duration_minutes)}</TableCell>
              <TableCell>{formatCurrency(((e.duration_minutes ?? 0) / 60) * e.rate_snapshot)}</TableCell>
            </TableRow>
          ))}
          {entries.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                No billable entries match this filter.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        {entries.length > 0 && (
          <TableFooter>
            <TableRow>
              <TableCell colSpan={4}>Total</TableCell>
              <TableCell>{formatMinutes(totalMinutes)}</TableCell>
              <TableCell>{formatCurrency(totalAmount)}</TableCell>
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
  );
}
