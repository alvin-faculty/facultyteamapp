"use client";

import { useState, useTransition } from "react";
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
import { sectionColorClass } from "@/lib/section-color";
import { cn } from "@/lib/utils";
import type { Profile, Section, Task, TaskCommentWithAuthor } from "@/lib/supabase/types";

function DraggableTaskRow({
  task,
  projectId,
  assignee,
  commentCount,
  sectionColorIndex,
  onOpenTask,
}: {
  task: Task;
  projectId: string;
  assignee: Profile | null;
  commentCount: number;
  sectionColorIndex: number;
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
        assignee={assignee}
        commentCount={commentCount}
        sectionColorIndex={sectionColorIndex}
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
  profiles,
  commentCountByTask,
  onOpenTask,
}: {
  section: Section;
  sectionIndex: number;
  tasks: Task[];
  allTasks: Task[];
  projectId: string;
  profiles: Profile[];
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
          <span className={cn("size-2 rounded-full", sectionColorClass(sectionIndex))} />
          <span className="text-[11px] font-semibold tracking-[0.05em] uppercase">{section.name}</span>
        </div>
        <span className="rounded-full bg-muted px-1.5 py-px text-[9px] text-muted-foreground">
          {completed}/{tasks.length}
        </span>
      </div>
      <div className="flex-1 space-y-1.5 overflow-y-auto pr-1 pb-2">
        {tasks.map((task) => (
          <div key={task.id} className="space-y-1">
            <DraggableTaskRow
              task={task}
              projectId={projectId}
              assignee={profiles.find((p) => p.id === task.assignee_id) ?? null}
              commentCount={commentCountByTask[task.id] ?? 0}
              sectionColorIndex={sectionIndex}
              onOpenTask={onOpenTask}
            />
            {allTasks
              .filter((t) => t.parent_task_id === task.id)
              .map((sub) => (
                <TaskCard
                  key={sub.id}
                  task={sub}
                  projectId={projectId}
                  assignee={profiles.find((p) => p.id === sub.assignee_id) ?? null}
                  commentCount={commentCountByTask[sub.id] ?? 0}
                  indented
                  onClick={() => onOpenTask(sub.id)}
                />
              ))}
          </div>
        ))}
      </div>
      <NewTaskDialog projectId={projectId} sectionId={section.id} profiles={profiles} />
    </div>
  );
}

export function KanbanBoard({
  projectId,
  sections,
  tasks,
  profiles,
  comments,
}: {
  projectId: string;
  sections: Section[];
  tasks: Task[];
  profiles: Profile[];
  comments: TaskCommentWithAuthor[];
}) {
  const [prevTasks, setPrevTasks] = useState(tasks);
  const [localTasks, setLocalTasks] = useState(tasks);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
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
              profiles={profiles}
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
        projectId={projectId}
        profiles={profiles}
        subtasks={selectedSubtasks}
        comments={selectedComments}
        onOpenChange={(open) => !open && setSelectedTaskId(null)}
      />
    </div>
  );
}
