"use client";

import { useTransition } from "react";
import { deleteTimeEntry, toggleBillable } from "@/lib/actions/time-entries";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatMinutes } from "@/lib/format";
import { Trash2 } from "lucide-react";
import type { TimeEntry } from "@/lib/supabase/types";

export function TimeEntryTable({
  entries,
  showProject = false,
}: {
  entries: (TimeEntry & { projects?: { name: string } | null; profiles?: { name: string } | null })[];
  showProject?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No time entries yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          {showProject && <TableHead>Project</TableHead>}
          <TableHead>Who</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Billable</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell>{formatDate(entry.started_at.slice(0, 10))}</TableCell>
            {showProject && <TableCell>{entry.projects?.name}</TableCell>}
            <TableCell>{entry.profiles?.name}</TableCell>
            <TableCell className="max-w-64 truncate">{entry.description}</TableCell>
            <TableCell>{formatMinutes(entry.duration_minutes)}</TableCell>
            <TableCell>
              {entry.locked ? (
                <Badge variant="secondary">{entry.billable ? "Billable" : "Non-billable"}</Badge>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={() => startTransition(() => toggleBillable(entry.id, !entry.billable))}
                >
                  {entry.billable ? "Billable" : "Non-billable"}
                </Button>
              )}
            </TableCell>
            <TableCell>
              {entry.locked ? (
                <Badge variant="outline">Invoiced</Badge>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={isPending}
                  onClick={() => startTransition(() => deleteTimeEntry(entry.id, entry.project_id))}
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
