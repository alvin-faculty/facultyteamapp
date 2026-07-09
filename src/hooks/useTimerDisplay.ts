"use client";

import { useState } from "react";
import type { RunningTimeEntry } from "@/lib/actions/time-entries";

/**
 * Tracks the most recent time entry relevant to this timer slot (a specific task, or the
 * global top-bar slot). Once `isMine` goes false after having been true (i.e. the timer
 * stopped), the last-known entry is kept in state instead of disappearing, so the UI can
 * keep it visible and clickable to edit until a new timer starts here.
 */
export function useTimerDisplay(runningEntry: RunningTimeEntry | null, isMine: boolean) {
  const nextEntry = isMine ? runningEntry : null;
  const [lastEntry, setLastEntry] = useState<RunningTimeEntry | null>(nextEntry);
  const [trackedId, setTrackedId] = useState<string | null>(nextEntry?.id ?? null);

  // Adjust state during render (React-sanctioned pattern) instead of an effect, so the
  // freshly-running entry is reflected immediately without an extra render pass.
  if (nextEntry && nextEntry.id !== trackedId) {
    setTrackedId(nextEntry.id);
    setLastEntry(nextEntry);
  }

  return {
    lastEntry,
    isRunning: isMine && runningEntry !== null,
    freeze: setLastEntry,
  };
}
