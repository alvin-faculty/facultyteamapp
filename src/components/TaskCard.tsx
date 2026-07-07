"use client";

import { useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { toggleTaskCompleted } from "@/lib/actions/tasks";
import { sectionBorderColorClass } from "@/lib/section-color";
import { profileColorClass } from "@/lib/profile-color";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Profile, Task } from "@/lib/supabase/types";

function MetaLine({
  task,
  assignee,
  commentCount,
}: {
  task: Task;
  assignee: Profile | null;
  commentCount: number;
}) {
  const overdue = task.due_date && new Date(task.due_date) < new Date() && !task.completed;
  if (!assignee && !task.due_date && commentCount === 0) return null;

  return (
    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
      {assignee && (
        <>
          <span className={cn("size-2 shrink-0 rounded-full", profileColorClass(assignee.id))} />
          <span className="truncate">{assignee.name}</span>
        </>
      )}
      {task.due_date && (
        <span className={cn("whitespace-nowrap", overdue && "font-semibold text-destructive")}>
          {assignee ? "· " : ""}
          {formatDate(task.due_date)}
        </span>
      )}
      {commentCount > 0 && (
        <span className="whitespace-nowrap">
          {assignee || task.due_date ? "· " : ""}
          {commentCount} {commentCount === 1 ? "note" : "notes"}
        </span>
      )}
    </div>
  );
}

export function TaskCard({
  task,
  projectId,
  assignee,
  commentCount = 0,
  sectionColorIndex = 0,
  indented = false,
  onClick,
}: {
  task: Task;
  projectId: string;
  assignee: Profile | null;
  commentCount?: number;
  sectionColorIndex?: number;
  indented?: boolean;
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
      className="mt-0.5 size-4 rounded-full border-2"
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

  if (indented) {
    return (
      <div
        onClick={onClick}
        className={cn(
          "ml-6 flex items-start gap-2 rounded-md border-l py-1 pl-3",
          onClick && "cursor-pointer hover:bg-muted/50",
        )}
      >
        {checkbox}
        <div className="min-w-0 flex-1 space-y-0.5">
          {title}
          <MetaLine task={task} assignee={assignee} commentCount={commentCount} />
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl border border-l-4 bg-card px-3 py-2.5",
        sectionBorderColorClass(sectionColorIndex),
        onClick && "cursor-pointer transition-colors hover:bg-muted/40",
      )}
    >
      <div className="flex items-start gap-2">
        {checkbox}
        <div className="min-w-0 flex-1 space-y-1">
          {title}
          <MetaLine task={task} assignee={assignee} commentCount={commentCount} />
        </div>
      </div>
    </div>
  );
}
