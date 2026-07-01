"use client";

import { useEffect, useState, useTransition } from "react";
import { startTimer, stopTimer } from "@/lib/actions/time-entries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Task, TimeEntry } from "@/lib/supabase/types";
import { Play, Square } from "lucide-react";

interface ProjectOption {
  id: string;
  name: string;
}

export function TimerWidget({
  runningEntry,
  projects,
  tasks,
}: {
  runningEntry: (TimeEntry & { projects: { name: string } | null }) | null;
  projects: ProjectOption[];
  tasks: Task[];
}) {
  const [elapsed, setElapsed] = useState(0);
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [taskId, setTaskId] = useState<string>("none");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!runningEntry) return;
    const tick = () => {
      setElapsed(Math.floor((Date.now() - new Date(runningEntry.started_at).getTime()) / 1000));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [runningEntry]);

  const projectTasks = tasks.filter((t) => t.project_id === projectId);

  if (runningEntry) {
    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = elapsed % 60;
    return (
      <div className="flex items-center gap-4 rounded-lg border bg-muted/30 p-4">
        <div className="flex-1">
          <p className="font-medium">{runningEntry.projects?.name}</p>
          {runningEntry.description && (
            <p className="text-sm text-muted-foreground">{runningEntry.description}</p>
          )}
        </div>
        <span className="font-mono text-lg tabular-nums">
          {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
        </span>
        <Button
          variant="destructive"
          disabled={isPending}
          onClick={() => startTransition(() => stopTimer(runningEntry.id))}
        >
          <Square className="size-4" />
          Stop
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border p-4">
      <Select value={projectId} onValueChange={(value) => setProjectId(value ?? "")}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Project" />
        </SelectTrigger>
        <SelectContent>
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={taskId} onValueChange={(value) => setTaskId(value ?? "none")}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Task (optional)" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No task</SelectItem>
          {projectTasks.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        placeholder="What are you working on?"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="min-w-48 flex-1"
      />
      <Button
        disabled={!projectId || isPending}
        onClick={() =>
          startTransition(() =>
            startTimer(projectId, taskId === "none" ? null : taskId, description),
          )
        }
      >
        <Play className="size-4" />
        Start
      </Button>
    </div>
  );
}
