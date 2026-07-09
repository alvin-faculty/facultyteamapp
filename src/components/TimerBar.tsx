"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { createManualEntry, startTimer, stopTimer, type RunningTimeEntry } from "@/lib/actions/time-entries";
import { useTimerDisplay } from "@/hooks/useTimerDisplay";
import { InlineDurationEdit } from "@/components/InlineDurationEdit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlayIcon, PlusIcon, SquareIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { todayISODate } from "@/lib/format";

type TimerProject = { id: string; name: string; clientName: string | null };
type TimerTask = { id: string; title: string; project_id: string; billable: boolean };

function projectLabel(p: TimerProject): string {
  return p.clientName ? `${p.clientName} — ${p.name}` : p.name;
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const PROJECT_PREFIX = "project:";
const TASK_PREFIX = "task:";

function parseSelection(
  value: string,
  tasks: { id: string; project_id: string }[],
): { projectId: string; taskId: string | null } {
  if (value.startsWith(TASK_PREFIX)) {
    const taskId = value.slice(TASK_PREFIX.length);
    const task = tasks.find((t) => t.id === taskId);
    return { projectId: task?.project_id ?? "", taskId };
  }
  return { projectId: value.slice(PROJECT_PREFIX.length), taskId: null };
}

function ProjectTaskSelect({
  projects,
  tasks,
  value,
  onChange,
  className,
}: {
  projects: TimerProject[];
  tasks: TimerTask[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const items = Object.fromEntries(
    projects.flatMap((p) => [
      [`${PROJECT_PREFIX}${p.id}`, `${projectLabel(p)} — General`],
      ...tasks
        .filter((t) => t.project_id === p.id)
        .map((t): [string, string] => [`${TASK_PREFIX}${t.id}`, `${projectLabel(p)} — ${t.title}`]),
    ]),
  );

  return (
    <Select value={value} onValueChange={(v) => onChange(v ?? "")} items={items}>
      <SelectTrigger className={cn("h-8", !value && "text-muted-foreground", className)}>
        <SelectValue placeholder="Project · Task" />
      </SelectTrigger>
      <SelectContent>
        {projects.map((p) => (
          <SelectGroup key={p.id}>
            <SelectLabel>{projectLabel(p)}</SelectLabel>
            <SelectItem value={`${PROJECT_PREFIX}${p.id}`}>General</SelectItem>
            {tasks
              .filter((t) => t.project_id === p.id)
              .map((t) => (
                <SelectItem key={t.id} value={`${TASK_PREFIX}${t.id}`}>
                  {t.title}
                </SelectItem>
              ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}

function ManualEntryDialog({
  projects,
  tasks,
}: {
  projects: TimerProject[];
  tasks: TimerTask[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selection, setSelection] = useState(projects[0] ? `${PROJECT_PREFIX}${projects[0].id}` : "");
  const [date, setDate] = useState(todayISODate());
  const [hours, setHours] = useState("");
  const [description, setDescription] = useState("");
  const { projectId, taskId } = parseSelection(selection, tasks);

  const [billable, setBillable] = useState(() => tasks.find((t) => t.id === taskId)?.billable ?? true);
  const [billableSyncedFor, setBillableSyncedFor] = useState(taskId);
  if (taskId !== billableSyncedFor) {
    setBillableSyncedFor(taskId);
    setBillable(tasks.find((t) => t.id === taskId)?.billable ?? true);
  }

  function submit() {
    const formData = new FormData();
    formData.set("project_id", projectId);
    if (taskId) formData.set("task_id", taskId);
    formData.set("date", date);
    formData.set("hours", hours);
    formData.set("description", description);
    if (billable) formData.set("billable", "on");

    startTransition(async () => {
      try {
        await createManualEntry(formData);
        toast.success("Entry added");
        setOpen(false);
        setHours("");
        setDescription("");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add entry");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-sm" disabled={projects.length === 0}>
            <PlusIcon className="size-4" />
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add time entry</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Project · Task</Label>
            <ProjectTaskSelect
              projects={projects}
              tasks={tasks}
              value={selection}
              onChange={setSelection}
              className="w-full"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="manual-date">Date</Label>
              <Input id="manual-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-hours">Hours</Label>
              <Input
                id="manual-hours"
                type="number"
                min="0"
                step="0.25"
                placeholder="1.5"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="manual-description">Description</Label>
            <Input
              id="manual-description"
              placeholder="What did you work on?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={billable} onCheckedChange={(c) => setBillable(c === true)} id="manual-billable" />
            <Label htmlFor="manual-billable" className="font-normal">
              Billable
            </Label>
          </div>
          <Button
            className="w-full"
            disabled={!projectId || !date || !hours || isPending}
            onClick={submit}
          >
            Add entry
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TimerBar({
  runningEntry,
  projects,
  tasks,
}: {
  runningEntry: RunningTimeEntry | null;
  projects: TimerProject[];
  tasks: TimerTask[];
}) {
  const { lastEntry, isRunning, freeze } = useTimerDisplay(runningEntry, true);
  const [elapsed, setElapsed] = useState(0);
  const [frozenSeconds, setFrozenSeconds] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [selection, setSelection] = useState(
    projects[0] ? `${PROJECT_PREFIX}${projects[0].id}` : "",
  );
  const [description, setDescription] = useState("");

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

  if (isRunning && runningEntry) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-destructive" />
          <span className="max-w-48 truncate">
            {runningEntry.description || runningEntry.tasks?.title || runningEntry.projects?.name || "Timer"}
          </span>
        </span>
        {runningEntry.projects?.name && (
          <span className="hidden max-w-32 truncate text-xs text-muted-foreground sm:inline">
            {runningEntry.projects.name}
          </span>
        )}
        <span className="font-mono text-xs tabular-nums">{formatElapsed(elapsed)}</span>
        <Button
          size="icon-sm"
          className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/80"
          disabled={isPending}
          onClick={handleStop}
        >
          <SquareIcon className="size-3 fill-current" />
        </Button>
        <ManualEntryDialog projects={projects} tasks={tasks} />
      </div>
    );
  }

  if (lastEntry) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
          <span className="max-w-48 truncate text-muted-foreground">
            {lastEntry.description || lastEntry.tasks?.title || lastEntry.projects?.name || "Timer"}
          </span>
        </span>
        <InlineDurationEdit
          entryId={lastEntry.id}
          seconds={frozenSeconds}
          onSaved={setFrozenSeconds}
          className="text-muted-foreground"
        />
        <Button
          size="icon-sm"
          className="rounded-full"
          disabled={isPending}
          title="Continue"
          onClick={() =>
            startTransition(() =>
              startTimer(lastEntry.project_id, lastEntry.task_id, lastEntry.description ?? ""),
            )
          }
        >
          <PlayIcon className="size-3 fill-current" />
        </Button>
        <ManualEntryDialog projects={projects} tasks={tasks} />
      </div>
    );
  }

  const { projectId } = parseSelection(selection, tasks);

  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="What are you working on?"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="h-8 w-36 sm:w-56"
      />
      <ProjectTaskSelect
        projects={projects}
        tasks={tasks}
        value={selection}
        onChange={setSelection}
        className="w-40 sm:w-64"
      />
      <Button
        size="icon-sm"
        className="rounded-full"
        disabled={!projectId || isPending}
        onClick={() =>
          startTransition(async () => {
            const { projectId, taskId } = parseSelection(selection, tasks);
            await startTimer(projectId, taskId, description);
            setDescription("");
          })
        }
      >
        <PlayIcon className="size-3 fill-current" />
      </Button>
      <ManualEntryDialog projects={projects} tasks={tasks} />
    </div>
  );
}
