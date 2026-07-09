"use client";

import type { ComponentType, ReactNode } from "react";
import { useEffect, useState, useTransition } from "react";
import {
  Sheet,
  SheetClose,
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
  updateTaskBillable,
  updateTaskDescription,
  updateTaskDueDate,
} from "@/lib/actions/tasks";
import { assignTaskMember, unassignTaskMember } from "@/lib/actions/task-assignees";
import { addTaskComment } from "@/lib/actions/task-comments";
import { startTimer, stopTimer, type RunningTimeEntry } from "@/lib/actions/time-entries";
import { useTimerDisplay } from "@/hooks/useTimerDisplay";
import { InlineDurationEdit } from "@/components/InlineDurationEdit";
import { sectionColorClass } from "@/lib/section-color";
import { profileColorClass } from "@/lib/profile-color";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  CalendarIcon,
  ChevronLeftIcon,
  ClockIcon,
  DollarSignIcon,
  HomeIcon,
  PlayIcon,
  SquareIcon,
  TimerIcon,
  Trash2Icon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import type { Profile, Section, Task, TaskCommentWithAuthor } from "@/lib/supabase/types";

function FieldRow({
  icon: Icon,
  label,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="flex w-32 shrink-0 items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4" />
        {label}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function TaskDetailPanel({
  task,
  section,
  sectionIndex,
  parentTask,
  projectId,
  profiles,
  assignees,
  subtasks,
  comments,
  currentUser,
  runningEntry,
  onOpenChange,
  onNavigateToTask,
}: {
  task: Task | null;
  section: Section | undefined;
  sectionIndex: number;
  parentTask: Task | null;
  projectId: string;
  profiles: Profile[];
  assignees: Profile[];
  subtasks: Task[];
  comments: TaskCommentWithAuthor[];
  currentUser: { id: string; name: string };
  runningEntry: RunningTimeEntry | null;
  onOpenChange: (open: boolean) => void;
  onNavigateToTask: (taskId: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [description, setDescription] = useState(task?.description ?? "");
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [frozenSeconds, setFrozenSeconds] = useState(0);

  const { lastEntry, isRunning: isRunningHere, freeze } = useTimerDisplay(
    runningEntry,
    task !== null && runningEntry?.task_id === task.id,
  );
  const isRunningElsewhere = runningEntry !== null && !isRunningHere;

  useEffect(() => {
    if (!isRunningHere || !runningEntry) return;
    const tick = () =>
      setElapsed(Math.floor((Date.now() - new Date(runningEntry.started_at).getTime()) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isRunningHere, runningEntry]);

  function handleStopTimer() {
    if (!runningEntry) return;
    const seconds = Math.floor((Date.now() - new Date(runningEntry.started_at).getTime()) / 1000);
    setFrozenSeconds(seconds);
    freeze({ ...runningEntry, ended_at: new Date().toISOString(), duration_minutes: Math.round(seconds / 60) });
    startTransition(() => stopTimer(runningEntry.id));
  }

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
      <SheetContent showCloseButton={false} className="overflow-y-auto sm:max-w-lg">
        {task && (
          <div key={task.id} className="flex h-full flex-col">
            <SheetHeader className="gap-2">
              <div className="flex items-center justify-between">
                <div className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
                  {parentTask ? (
                    <button
                      type="button"
                      onClick={() => onNavigateToTask(parentTask.id)}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      <ChevronLeftIcon className="size-4" />
                      Back
                    </button>
                  ) : (
                    <span className="text-[11px] font-semibold tracking-[0.05em] uppercase">{section?.name}</span>
                  )}
                  {parentTask && (
                    <>
                      <span className="text-muted-foreground/50">·</span>
                      <span className="truncate">{parentTask.title}</span>
                    </>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <span className={cn("size-2 rounded-full", sectionColorClass(sectionIndex))} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        await deleteTask(task.id, projectId);
                        onOpenChange(false);
                      })
                    }
                  >
                    <Trash2Icon className="size-4 text-destructive" />
                  </Button>
                  <SheetClose
                    render={
                      <Button type="button" variant="ghost" size="icon-sm">
                        <XIcon className="size-4" />
                      </Button>
                    }
                  />
                </div>
              </div>
              <SheetTitle className="text-lg">{task.title}</SheetTitle>
            </SheetHeader>

            <div className="flex-1 divide-y overflow-y-auto px-4 pb-4">
              <div>
                <FieldRow icon={ClockIcon} label="Status">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={(checked) =>
                        startTransition(() => toggleTaskCompleted(task.id, projectId, checked === true))
                      }
                    />
                    <span className="text-sm">{task.completed ? "Done" : (section?.name ?? "To do")}</span>
                  </div>
                </FieldRow>

                <FieldRow icon={CalendarIcon} label="Due date">
                  <Input
                    type="date"
                    defaultValue={task.due_date ?? ""}
                    onChange={(e) =>
                      startTransition(() => updateTaskDueDate(task.id, projectId, e.target.value))
                    }
                    className="border-transparent bg-transparent px-0 shadow-none hover:border-input focus-visible:border-input focus-visible:bg-background"
                  />
                </FieldRow>

                {parentTask && (
                  <FieldRow icon={HomeIcon} label="Parent task">
                    <button
                      type="button"
                      onClick={() => onNavigateToTask(parentTask.id)}
                      className="truncate text-sm text-primary hover:underline"
                    >
                      {parentTask.title}
                    </button>
                  </FieldRow>
                )}

                <FieldRow icon={TimerIcon} label="Timer">
                  {isRunningHere && runningEntry ? (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm tabular-nums">{formatElapsed(elapsed)}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        disabled={isPending}
                        onClick={handleStopTimer}
                      >
                        <SquareIcon className="size-3" />
                        Stop
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {lastEntry && (
                        <InlineDurationEdit
                          entryId={lastEntry.id}
                          seconds={frozenSeconds}
                          onSaved={setFrozenSeconds}
                          className="text-sm text-muted-foreground"
                        />
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        disabled={isPending}
                        onClick={() => startTransition(() => startTimer(projectId, task.id, ""))}
                      >
                        <PlayIcon className="size-3" />
                        Start timer
                      </Button>
                      {isRunningElsewhere && (
                        <span className="truncate text-xs text-muted-foreground">
                          Running on {runningEntry?.tasks?.title ?? runningEntry?.projects?.name}
                        </span>
                      )}
                    </div>
                  )}
                </FieldRow>

                <FieldRow icon={DollarSignIcon} label="Billable">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={task.billable}
                      disabled={isPending}
                      onCheckedChange={(checked) =>
                        startTransition(() => updateTaskBillable(task.id, projectId, checked === true))
                      }
                    />
                    <span className="text-sm">{task.billable ? "Billable Time" : "Non-billable Time"}</span>
                  </div>
                </FieldRow>

                <FieldRow icon={UsersIcon} label="Assignees">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <button
                          type="button"
                          disabled={isPending}
                          className="truncate text-sm hover:text-foreground disabled:opacity-50"
                        >
                          {assignees.length > 0 ? assignees.map((p) => p.name).join(", ") : "Unassigned"}
                        </button>
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
                </FieldRow>
              </div>

              <div className="space-y-1 py-4">
                <p className="text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">Description</p>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={() =>
                    startTransition(() => updateTaskDescription(task.id, projectId, description))
                  }
                  placeholder="Add a description, details, links…"
                  className="min-h-20 border-transparent px-0 shadow-none focus-visible:border-transparent focus-visible:ring-0"
                />
              </div>

              <div className="space-y-2 py-4">
                <p className="text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">Subtasks</p>
                <div className="divide-y">
                  {subtasks.map((sub) => (
                    <div key={sub.id} className="flex items-center gap-2 py-2">
                      <Checkbox
                        checked={sub.completed}
                        onCheckedChange={(checked) =>
                          startTransition(() => toggleTaskCompleted(sub.id, projectId, checked === true))
                        }
                      />
                      <button
                        type="button"
                        onClick={() => onNavigateToTask(sub.id)}
                        className={cn(
                          "flex-1 truncate text-left text-sm hover:underline",
                          sub.completed && "text-muted-foreground line-through",
                        )}
                      >
                        {sub.title}
                      </button>
                    </div>
                  ))}
                </div>
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
                    className="border-dashed"
                  />
                </form>
              </div>

              <div className="space-y-3 py-4">
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
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white",
                      profileColorClass(currentUser.id),
                    )}
                  >
                    {currentUser.name.charAt(0).toUpperCase()}
                  </span>
                  <Textarea name="body" placeholder="Add a comment or drop files…" className="min-h-16" required />
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
