"use client";

import { useState, useTransition } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  createSubtask,
  deleteTask,
  toggleTaskCompleted,
  updateTaskDescription,
  updateTaskDueDate,
} from "@/lib/actions/tasks";
import { assignTaskMember, unassignTaskMember } from "@/lib/actions/task-assignees";
import { addTaskComment } from "@/lib/actions/task-comments";
import { sectionColorClass } from "@/lib/section-color";
import { profileColorClass } from "@/lib/profile-color";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Trash2Icon, UsersIcon } from "lucide-react";
import type { Profile, Section, Task, TaskCommentWithAuthor } from "@/lib/supabase/types";

export function TaskDetailPanel({
  task,
  section,
  sectionIndex,
  projectId,
  profiles,
  assignees,
  subtasks,
  comments,
  onOpenChange,
}: {
  task: Task | null;
  section: Section | undefined;
  sectionIndex: number;
  projectId: string;
  profiles: Profile[];
  assignees: Profile[];
  subtasks: Task[];
  comments: TaskCommentWithAuthor[];
  onOpenChange: (open: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [description, setDescription] = useState(task?.description ?? "");
  const [subtaskTitle, setSubtaskTitle] = useState("");

  function toggleAssignee(userId: string, checked: boolean) {
    if (!task) return;
    startTransition(() =>
      checked
        ? assignTaskMember(task.id, projectId, userId)
        : unassignTaskMember(task.id, projectId, userId),
    );
  }

  return (
    <Sheet open={task !== null} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        {task && (
          <div key={task.id} className="flex h-full flex-col">
            <SheetHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn("size-2 rounded-full", sectionColorClass(sectionIndex))} />
                  <span className="text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">
                    {section?.name}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() =>
                    startTransition(async () => {
                      await deleteTask(task.id, projectId);
                      onOpenChange(false);
                    })
                  }
                >
                  <Trash2Icon className="size-4 text-destructive" />
                </Button>
              </div>
              <SheetTitle className="text-lg">{task.title}</SheetTitle>
            </SheetHeader>

            <div className="flex-1 space-y-6 overflow-y-auto px-4 pb-4">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={task.completed}
                  onCheckedChange={(checked) =>
                    startTransition(() => toggleTaskCompleted(task.id, projectId, checked === true))
                  }
                  className="size-4 rounded-full border-2"
                />
                <span className="text-sm">Mark complete</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">Due date</p>
                  <Input
                    type="date"
                    defaultValue={task.due_date ?? ""}
                    onChange={(e) =>
                      startTransition(() => updateTaskDueDate(task.id, projectId, e.target.value))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">Assignees</p>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button variant="outline" size="sm" disabled={isPending} className="w-full justify-start">
                          <UsersIcon className="size-3.5" />
                          {assignees.length > 0
                            ? assignees.map((p) => p.name).join(", ")
                            : "Unassigned"}
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="start">
                      {profiles.map((profile) => (
                        <DropdownMenuCheckboxItem
                          key={profile.id}
                          checked={assignees.some((a) => a.id === profile.id)}
                          onCheckedChange={(checked) => toggleAssignee(profile.id, checked === true)}
                          closeOnClick={false}
                        >
                          {profile.name}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {assignees.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {assignees.map((profile) => (
                        <span key={profile.id} className="flex items-center gap-1">
                          <span className={cn("size-2 rounded-full", profileColorClass(profile.id))} />
                          <span className="text-[13px]">{profile.name}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">Description</p>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={() =>
                    startTransition(() => updateTaskDescription(task.id, projectId, description))
                  }
                  placeholder="Add a description, details, links…"
                  className="min-h-20"
                />
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">Subtasks</p>
                {subtasks.map((sub) => (
                  <div key={sub.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={sub.completed}
                      onCheckedChange={(checked) =>
                        startTransition(() => toggleTaskCompleted(sub.id, projectId, checked === true))
                      }
                      className="size-4 rounded-full border-2"
                    />
                    <span className={cn("text-sm", sub.completed && "text-muted-foreground line-through")}>
                      {sub.title}
                    </span>
                  </div>
                ))}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!subtaskTitle.trim()) return;
                    startTransition(() => createSubtask(projectId, task.id, subtaskTitle.trim()));
                    setSubtaskTitle("");
                  }}
                >
                  <Input
                    placeholder="+ Add a subtask…"
                    value={subtaskTitle}
                    onChange={(e) => setSubtaskTitle(e.target.value)}
                    disabled={isPending}
                  />
                </form>
              </div>

              <div className="space-y-3">
                <p className="text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">Activity</p>
                <div className="space-y-3">
                  {comments.length === 0 && (
                    <p className="text-sm text-muted-foreground">No comments yet.</p>
                  )}
                  {comments.map((c) => (
                    <div key={c.id} className="text-sm">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span className={cn("size-2 rounded-full", profileColorClass(c.user_id))} />
                        <span className="font-semibold text-foreground">
                          {c.profiles?.name ?? "Someone"}
                        </span>
                        <span>· {formatDate(c.created_at.slice(0, 10))}</span>
                      </div>
                      <p className="mt-0.5 whitespace-pre-wrap text-[13px] text-muted-foreground">
                        {c.body}
                      </p>
                    </div>
                  ))}
                </div>
                <form
                  action={(formData) =>
                    startTransition(async () => {
                      await addTaskComment(projectId, task.id, formData);
                    })
                  }
                  className="flex gap-2"
                >
                  <Textarea name="body" placeholder="Add a comment…" className="min-h-16" required />
                  <Button type="submit" disabled={isPending} className="self-end">
                    Post
                  </Button>
                </form>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
