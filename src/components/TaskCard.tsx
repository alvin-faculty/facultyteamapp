"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toggleTaskCompleted } from "@/lib/actions/tasks";
import { startTimer, stopTimer, type RunningTimeEntry } from "@/lib/actions/time-entries";
import { useTimerDisplay } from "@/hooks/useTimerDisplay";
import { InlineDurationEdit } from "@/components/InlineDurationEdit";
import { profileColorClass } from "@/lib/profile-color";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PlayIcon, SquareIcon } from "lucide-react";
import type { Profile, Task } from "@/lib/supabase/types";

function MetaLine({
  task,
  assignees,
  commentCount,
}: {
  task: Task;
  assignees: Profile[];
  commentCount: number;
}) {
  const overdue = task.due_date && new Date(task.due_date) < new Date() && !task.completed;
  const shown = assignees.slice(0, 2);
  const extra = assignees.length - shown.length;
  if (assignees.length === 0 && !task.due_date && commentCount === 0) return null;

  return (
    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
      {shown.map((profile) => (
        <span key={profile.id} className="flex items-center gap-1">
          <span className={cn("size-2 shrink-0 rounded-full", profileColorClass(profile.id))} />
          <span className="truncate">{profile.name}</span>
        </span>
      ))}
      {extra > 0 && <span className="whitespace-nowrap">+{extra}</span>}
      {task.due_date && (
        <span className={cn("whitespace-nowrap", overdue && "font-semibold text-destructive")}>
          {assignees.length > 0 ? "· " : ""}
          {formatDate(task.due_date)}
        </span>
      )}
      {commentCount > 0 && (
        <span className="whitespace-nowrap">
          {assignees.length > 0 || task.due_date ? "· " : ""}
          {commentCount} {commentCount === 1 ? "note" : "notes"}
        </span>
      )}
    </div>
  );
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function TimerControl({
  task,
  projectId,
  runningEntry,
}: {
  task: Task;
  projectId: string;
  runningEntry: RunningTimeEntry | null;
}) {
  const { lastEntry, isRunning, freeze } = useTimerDisplay(runningEntry, runningEntry?.task_id === task.id);
  const [isPending, startTransition] = useTransition();
  const [elapsed, setElapsed] = useState(0);
  const [frozenSeconds, setFrozenSeconds] = useState(0);

  useEffect(() => {
    if (!isRunning || !runningEntry) return;
    const tick = () =>
      setElapsed(Math.floor((Date.now() - new Date(runningEntry.started_at).getTime()) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isRunning, runningEntry]);

  function handleStop() {
    if (!runningEntry) return;
    const seconds = Math.floor((Date.now() - new Date(runningEntry.started_at).getTime()) / 1000);
    setFrozenSeconds(seconds);
    freeze({ ...runningEntry, ended_at: new Date().toISOString(), duration_minutes: Math.round(seconds / 60) });
    startTransition(() => stopTimer(runningEntry.id));
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      {isRunning && (
        <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
          {formatElapsed(elapsed)}
        </span>
      )}
      {!isRunning && lastEntry && (
        <InlineDurationEdit
          entryId={lastEntry.id}
          seconds={frozenSeconds}
          onSaved={setFrozenSeconds}
          className="text-[10px] text-muted-foreground"
        />
      )}
      <Button
        type="button"
        size="icon-xs"
        className={cn(
          "rounded-full",
          isRunning && "bg-destructive text-destructive-foreground hover:bg-destructive/80",
        )}
        disabled={isPending}
        onClick={() =>
          isRunning && runningEntry
            ? handleStop()
            : startTransition(() => startTimer(projectId, task.id, ""))
        }
      >
        {isRunning ? (
          <SquareIcon className="size-2.5 fill-current" />
        ) : (
          <PlayIcon className="size-2.5 fill-current" />
        )}
      </Button>
    </div>
  );
}

export function TaskCard({
  task,
  projectId,
  assignees,
  commentCount = 0,
  indented = false,
  runningEntry,
  onClick,
}: {
  task: Task;
  projectId: string;
  assignees: Profile[];
  commentCount?: number;
  indented?: boolean;
  runningEntry?: RunningTimeEntry | null;
  onClick?: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  const checkbox = (
    <Checkbox
      checked={task.completed}
      disabled={isPending}
      onClick={(e) => e.stopPropagation()}
      onCheckedChange={(checked) =>
        startTransition(() => toggleTaskCompleted(task.id, projectId, checked === true))
      }
      className="mt-0.5"
    />
  );

  const title = (
    <p
      className={cn(
        "text-[13px]",
        indented ? "text-muted-foreground" : "font-medium",
        task.completed && "text-muted-foreground line-through",
      )}
    >
      {task.title}
    </p>
  );

  const timerControl = runningEntry !== undefined && (
    <TimerControl task={task} projectId={projectId} runningEntry={runningEntry} />
  );

  if (indented) {
    return (
      <div
        onClick={onClick}
        className={cn(
          "flex items-start gap-2 rounded-lg border bg-muted/30 py-1.5 px-3",
          onClick && "cursor-pointer hover:bg-muted/60",
        )}
      >
        {checkbox}
        <div className="min-w-0 flex-1 space-y-0.5">
          {title}
          <MetaLine task={task} assignees={assignees} commentCount={commentCount} />
        </div>
        {timerControl}
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-lg border bg-card px-3 py-2.5",
        onClick && "cursor-pointer transition-colors hover:bg-muted/40",
      )}
    >
      <div className="flex items-start gap-2">
        {checkbox}
        <div className="min-w-0 flex-1 space-y-1">
          {title}
          <MetaLine task={task} assignees={assignees} commentCount={commentCount} />
        </div>
        {timerControl}
      </div>
    </div>
  );
}
