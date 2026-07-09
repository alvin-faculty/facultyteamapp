"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateTimeEntryDuration } from "@/lib/actions/time-entries";
import { cn } from "@/lib/utils";

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function parseHMS(text: string): number | null {
  const parts = text.trim().split(":");
  if (parts.length === 0 || parts.length > 3) return null;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isFinite(n) || n < 0)) return null;
  if (nums.length === 3) return nums[0] * 3600 + nums[1] * 60 + nums[2];
  if (nums.length === 2) return nums[0] * 60 + nums[1];
  return nums[0] * 60;
}

export function InlineDurationEdit({
  entryId,
  seconds,
  onSaved,
  className,
}: {
  entryId: string;
  seconds: number;
  onSaved?: (newSeconds: number) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(() => formatElapsed(seconds));
  const [isPending, startTransition] = useTransition();

  function save() {
    const parsedSeconds = parseHMS(value);
    if (parsedSeconds === null || parsedSeconds <= 0) {
      setEditing(false);
      setValue(formatElapsed(seconds));
      return;
    }
    startTransition(async () => {
      try {
        await updateTimeEntryDuration(entryId, parsedSeconds / 3600);
        onSaved?.(parsedSeconds);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update duration");
        setValue(formatElapsed(seconds));
      }
      setEditing(false);
    });
  }

  if (editing) {
    return (
      <input
        type="text"
        inputMode="numeric"
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            save();
          } else if (e.key === "Escape") {
            setEditing(false);
            setValue(formatElapsed(seconds));
          }
        }}
        onClick={(e) => e.stopPropagation()}
        disabled={isPending}
        className={cn(
          "w-[4.5rem] rounded border border-input bg-background px-1 py-0.5 font-mono text-xs tabular-nums outline-none focus-visible:border-ring",
          className,
        )}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setValue(formatElapsed(seconds));
        setEditing(true);
      }}
      className={cn("font-mono tabular-nums hover:text-foreground hover:underline", className)}
    >
      {formatElapsed(seconds)}
    </button>
  );
}
