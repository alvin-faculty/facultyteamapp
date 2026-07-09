import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/current-user";
import { MyTasksList, type MyTaskItem } from "@/components/MyTasksList";
import type { RunningTimeEntry } from "@/lib/actions/time-entries";
import type { Client, Profile, Project, Task, TaskAssignee } from "@/lib/supabase/types";

type ProjectWithClient = Project & { clients: Client | null };

export default async function MyTasksPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: assignedRows }, { data: runningEntry }] = await Promise.all([
    supabase.from("task_assignees").select("task_id").eq("user_id", profile.id),
    supabase
      .from("time_entries")
      .select("*, projects(name), tasks(title)")
      .eq("user_id", profile.id)
      .is("ended_at", null)
      .maybeSingle(),
  ]);

  const taskIds = Array.from(new Set((assignedRows ?? []).map((r) => r.task_id)));

  if (taskIds.length === 0) {
    return (
      <div className="col-span-12 space-y-6">
        <h1 className="text-2xl font-semibold">My Tasks</h1>
        <p className="text-sm text-muted-foreground">No tasks are assigned to you yet.</p>
      </div>
    );
  }

  const { data: tasks } = await supabase.from("tasks").select("*").in("id", taskIds);
  const myTasks = (tasks as Task[]) ?? [];
  const projectIds = Array.from(new Set(myTasks.map((t) => t.project_id)));

  const [{ data: projects }, { data: profiles }, { data: taskAssignees }, { data: comments }] = await Promise.all([
    supabase.from("projects").select("*, clients(*)").in("id", projectIds),
    supabase.from("profiles").select("*").order("name"),
    supabase.from("task_assignees").select("*").in("task_id", taskIds),
    supabase.from("task_comments").select("task_id").in("task_id", taskIds),
  ]);

  const projectList = (projects as ProjectWithClient[]) ?? [];
  const allProfiles = (profiles as Profile[]) ?? [];
  const allTaskAssignees = (taskAssignees as TaskAssignee[]) ?? [];

  const commentCountByTask = ((comments as { task_id: string }[]) ?? []).reduce<Record<string, number>>(
    (acc, c) => {
      acc[c.task_id] = (acc[c.task_id] ?? 0) + 1;
      return acc;
    },
    {},
  );

  const items: MyTaskItem[] = myTasks
    .map((task) => {
      const project = projectList.find((p) => p.id === task.project_id);
      if (!project) return null;
      const assignees = allTaskAssignees
        .filter((ta) => ta.task_id === task.id)
        .map((ta) => allProfiles.find((p) => p.id === ta.user_id))
        .filter((p): p is Profile => Boolean(p));
      return {
        task,
        projectId: project.id,
        projectName: project.name,
        client: project.clients,
        assignees,
        commentCount: commentCountByTask[task.id] ?? 0,
      };
    })
    .filter((item): item is MyTaskItem => item !== null)
    .sort((a, b) => {
      if (a.task.due_date && b.task.due_date) return a.task.due_date.localeCompare(b.task.due_date);
      if (a.task.due_date) return -1;
      if (b.task.due_date) return 1;
      return a.task.title.localeCompare(b.task.title);
    });

  return (
    <div className="col-span-12 space-y-6">
      <h1 className="text-2xl font-semibold">My Tasks</h1>
      <MyTasksList items={items} runningEntry={runningEntry as RunningTimeEntry | null} />
    </div>
  );
}
