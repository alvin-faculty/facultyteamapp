"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { TaskCard } from "@/components/TaskCard";
import { TaskDetailPanel } from "@/components/TaskDetailPanel";
import { NewTaskDialog } from "@/components/NewTaskDialog";
import { NewSectionButton } from "@/components/NewSectionButton";
import { moveTask } from "@/lib/actions/tasks";
import type { RunningTimeEntry } from "@/lib/actions/time-entries";
import { sectionColorClass } from "@/lib/section-color";
import { cn } from "@/lib/utils";
import type { Profile, Section, Task, TaskAssignee, TaskCommentWithAuthor } from "@/lib/supabase/types";

function DraggableTaskRow({
  task,
  projectId,
  assignees,
  commentCount,
  onOpenTask,
}: {
  task: Task;
  projectId: string;
  assignees: Profile[];
  commentCount: number;
  onOpenTask: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      className={cn("touch-none", isDragging && "z-10 opacity-50")}
      {...listeners}
      {...attributes}
    >
      <TaskCard
        task={task}
        projectId={projectId}
        assignees={assignees}
        commentCount={commentCount}
        onClick={() => !isDragging && onOpenTask(task.id)}
      />
    </div>
  );
}

function Column({
  section,
  sectionIndex,
  tasks,
  allTasks,
  projectId,
  assigneesByTask,
  commentCountByTask,
  onOpenTask,
}: {
  section: Section;
  sectionIndex: number;
  tasks: Task[];
  allTasks: Task[];
  projectId: string;
  assigneesByTask: Record<string, Profile[]>;
  commentCountByTask: Record<string, number>;
  onOpenTask: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: section.id });
  const completed = tasks.filter((t) => t.completed).length;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex h-full w-72 shrink-0 flex-col rounded-lg border bg-card p-2",
        isOver && "bg-muted/50",
      )}
    >
      <div className="flex items-center justify-between px-1 pb-2">
        <div className="flex items-center gap-2">
          <span className={cn("size-2.5 rounded-full", sectionColorClass(sectionIndex))} />
          <span className="text-sm font-semibold">{section.name}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {completed}/{tasks.length}
        </span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto pr-1 pb-2">
        {tasks.map((task) => {
          const childTasks = allTasks.filter((t) => t.parent_task_id === task.id);
          return (
            <div key={task.id} className="space-y-1.5">
              <DraggableTaskRow
                task={task}
                projectId={projectId}
                assignees={assigneesByTask[task.id] ?? []}
                commentCount={commentCountByTask[task.id] ?? 0}
                onOpenTask={onOpenTask}
              />
              {childTasks.length > 0 && (
                <div className="ml-3 space-y-1.5 border-l pl-3">
                  {childTasks.map((sub) => (
                    <TaskCard
                      key={sub.id}
                      task={sub}
                      projectId={projectId}
                      assignees={assigneesByTask[sub.id] ?? []}
                      commentCount={commentCountByTask[sub.id] ?? 0}
                      indented
                      onClick={() => onOpenTask(sub.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <NewTaskDialog projectId={projectId} sectionId={section.id} />
    </div>
  );
}

export function KanbanBoard({
  projectId,
  sections,
  tasks,
  profiles,
  taskAssignees,
  comments,
  currentUser,
  runningEntry,
}: {
  projectId: string;
  sections: Section[];
  tasks: Task[];
  profiles: Profile[];
  taskAssignees: TaskAssignee[];
  comments: TaskCommentWithAuthor[];
  currentUser: { id: string; name: string };
  runningEntry: RunningTimeEntry | null;
}) {
  const searchParams = useSearchParams();
  const [prevTasks, setPrevTasks] = useState(tasks);
  const [localTasks, setLocalTasks] = useState(tasks);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(() => searchParams.get("task"));
  const [, startTransition] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  if (tasks !== prevTasks) {
    setPrevTasks(tasks);
    setLocalTasks(tasks);
  }

  const commentCountByTask = comments.reduce<Record<string, number>>((acc, c) => {
    acc[c.task_id] = (acc[c.task_id] ?? 0) + 1;
    return acc;
  }, {});

  const assigneesByTask = taskAssignees.reduce<Record<string, Profile[]>>((acc, ta) => {
    const profile = profiles.find((p) => p.id === ta.user_id);
    if (!profile) return acc;
    (acc[ta.task_id] ??= []).push(profile);
    return acc;
  }, {});

  const topLevelTasks = localTasks.filter((t) => t.parent_task_id === null);
  const completedTotal = topLevelTasks.filter((t) => t.completed).length;
  const pct = topLevelTasks.length > 0 ? Math.round((completedTotal / topLevelTasks.length) * 100) : 0;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const newSectionId = over.id as string;
    const task = localTasks.find((t) => t.id === active.id);
    if (!task || task.section_id === newSectionId) return;

    const position = localTasks.filter((t) => t.section_id === newSectionId).length;

    setLocalTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, section_id: newSectionId, position } : t)),
    );
    startTransition(() => moveTask(projectId, task.id, newSectionId, position));
  }

  const selectedTask = localTasks.find((t) => t.id === selectedTaskId) ?? null;
  const selectedSectionIndex = selectedTask
    ? sections.findIndex((s) => s.id === selectedTask.section_id)
    : -1;
  const selectedSubtasks = selectedTask
    ? localTasks.filter((t) => t.parent_task_id === selectedTask.id)
    : [];
  const selectedComments = selectedTask
    ? comments.filter((c) => c.task_id === selectedTask.id)
    : [];
  const selectedAssignees = selectedTask ? (assigneesByTask[selectedTask.id] ?? []) : [];
  const selectedParentTask = selectedTask
    ? (localTasks.find((t) => t.id === selectedTask.parent_task_id) ?? null)
    : null;

  return (
    <div className="col-span-12 space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">
          Workflow
        </h2>
        {topLevelTasks.length > 0 && (
          <span className="text-[10px] text-muted-foreground">
            {completedTotal}/{topLevelTasks.length} tasks · {pct}%
          </span>
        )}
      </div>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex h-[70vh] items-stretch gap-4 overflow-x-auto pb-2">
          {sections.map((section, index) => (
            <Column
              key={section.id}
              section={section}
              sectionIndex={index}
              tasks={topLevelTasks
                .filter((t) => t.section_id === section.id)
                .sort((a, b) => a.position - b.position)}
              allTasks={localTasks}
              projectId={projectId}
              assigneesByTask={assigneesByTask}
              commentCountByTask={commentCountByTask}
              onOpenTask={setSelectedTaskId}
            />
          ))}
          <NewSectionButton projectId={projectId} />
        </div>
      </DndContext>
      <TaskDetailPanel
        key={selectedTaskId ?? "none"}
        task={selectedTask}
        section={sections[selectedSectionIndex]}
        sectionIndex={selectedSectionIndex}
        parentTask={selectedParentTask}
        projectId={projectId}
        profiles={profiles}
        assignees={selectedAssignees}
        subtasks={selectedSubtasks}
        comments={selectedComments}
        currentUser={currentUser}
        runningEntry={runningEntry}
        onOpenChange={(open) => !open && setSelectedTaskId(null)}
        onNavigateToTask={setSelectedTaskId}
      />
    </div>
  );
}
