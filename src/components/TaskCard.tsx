"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TaskCommentThread } from "@/components/TaskCommentThread";
import { formatDate } from "@/lib/format";
import type { Profile, Task, TaskComment } from "@/lib/supabase/types";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function TaskCard({
  task,
  projectId,
  assignee,
  comments,
}: {
  task: Task;
  projectId: string;
  assignee: Profile | null;
  comments: (TaskComment & { profiles?: { name: string } | null })[];
}) {
  const [open, setOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const overdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "done";

  return (
    <>
      <Card
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        onClick={() => !isDragging && setOpen(true)}
        className="cursor-grab touch-none py-3 active:cursor-grabbing"
      >
        <CardContent className="space-y-2 px-3">
          <p className="text-sm font-medium">{task.title}</p>
          <div className="flex items-center justify-between">
            {task.due_date ? (
              <Badge variant={overdue ? "destructive" : "outline"} className="text-xs">
                {formatDate(task.due_date)}
              </Badge>
            ) : (
              <span />
            )}
            {assignee && (
              <Avatar className="size-6">
                <AvatarFallback className="text-[10px]">{initials(assignee.name)}</AvatarFallback>
              </Avatar>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{task.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              {assignee && <span>Assigned to {assignee.name}</span>}
              {task.due_date && <span>Due {formatDate(task.due_date)}</span>}
            </div>
            <TaskCommentThread projectId={projectId} taskId={task.id} comments={comments} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
