"use client";

import { useState, useTransition } from "react";
import { DndContext, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import { TaskCard } from "@/components/TaskCard";
import { NewTaskDialog } from "@/components/NewTaskDialog";
import { moveTask } from "@/lib/actions/tasks";
import type { Profile, Task, TaskComment, TaskStatus } from "@/lib/supabase/types";

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "todo", label: "To do" },
  { status: "in_progress", label: "In progress" },
  { status: "review", label: "Review" },
  { status: "done", label: "Done" },
];

function Column({
  status,
  label,
  tasks,
  projectId,
  profiles,
  commentsByTask,
}: {
  status: TaskStatus;
  label: string;
  tasks: Task[];
  projectId: string;
  profiles: Profile[];
  commentsByTask: Record<string, (TaskComment & { profiles?: { name: string } | null })[]>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-64 shrink-0 flex-col gap-2 rounded-lg border p-2 ${isOver ? "bg-muted/50" : ""}`}
    >
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
      </div>
      <div className="flex flex-col gap-2">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            projectId={projectId}
            assignee={profiles.find((p) => p.id === task.assignee_id) ?? null}
            comments={commentsByTask[task.id] ?? []}
          />
        ))}
      </div>
    </div>
  );
}

export function KanbanBoard({
  projectId,
  tasks,
  profiles,
  comments,
}: {
  projectId: string;
  tasks: Task[];
  profiles: Profile[];
  comments: (TaskComment & { profiles?: { name: string } | null })[];
}) {
  const [prevTasks, setPrevTasks] = useState(tasks);
  const [localTasks, setLocalTasks] = useState(tasks);
  const [, startTransition] = useTransition();

  if (tasks !== prevTasks) {
    setPrevTasks(tasks);
    setLocalTasks(tasks);
  }

  const commentsByTask = comments.reduce<Record<string, typeof comments>>((acc, c) => {
    (acc[c.task_id] ??= []).push(c);
    return acc;
  }, {});

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const newStatus = over.id as TaskStatus;
    const task = localTasks.find((t) => t.id === active.id);
    if (!task || task.status === newStatus) return;

    const position = localTasks.filter((t) => t.status === newStatus).length;

    setLocalTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus, position } : t)),
    );
    startTransition(() => moveTask(projectId, task.id, newStatus, position));
  }

  return (
    <div className="space-y-3">
      <NewTaskDialog projectId={projectId} profiles={profiles} />
      <DndContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {COLUMNS.map((col) => (
            <Column
              key={col.status}
              status={col.status}
              label={col.label}
              tasks={localTasks
                .filter((t) => t.status === col.status)
                .sort((a, b) => a.position - b.position)}
              projectId={projectId}
              profiles={profiles}
              commentsByTask={commentsByTask}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}
