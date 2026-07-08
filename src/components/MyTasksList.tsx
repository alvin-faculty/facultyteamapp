"use client";

import { useRouter } from "next/navigation";
import { TaskCard } from "@/components/TaskCard";
import type { Client, Profile, Task } from "@/lib/supabase/types";

export interface MyTaskItem {
  task: Task;
  projectId: string;
  projectName: string;
  client: Client | null;
  assignees: Profile[];
  commentCount: number;
}

export function MyTasksList({ items }: { items: MyTaskItem[] }) {
  const router = useRouter();

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No tasks are assigned to you yet.</p>;
  }

  const grouped = items.reduce<Record<string, MyTaskItem[]>>((acc, item) => {
    (acc[item.projectId] ??= []).push(item);
    return acc;
  }, {});

  const projectGroups = Object.values(grouped).sort((a, b) => a[0].projectName.localeCompare(b[0].projectName));

  return (
    <div className="space-y-6">
      {projectGroups.map((group) => {
        const { projectId, projectName, client } = group[0];
        return (
          <div key={projectId} className="space-y-2">
            <button
              type="button"
              onClick={() => router.push(`/projects/${projectId}`)}
              className="text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase hover:text-foreground"
            >
              {client ? `${client.name} — ${projectName}` : projectName}
            </button>
            <div className="space-y-1.5">
              {group.map(({ task, assignees, commentCount }) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  projectId={projectId}
                  assignees={assignees}
                  commentCount={commentCount}
                  onClick={() => router.push(`/projects/${projectId}`)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
