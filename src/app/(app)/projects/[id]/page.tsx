import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/current-user";
import { ProjectDetailView } from "@/components/ProjectDetailView";
import type { RunningTimeEntry } from "@/lib/actions/time-entries";
import type {
  Client,
  Profile,
  Project,
  Section,
  Task,
  TaskAssignee,
  TaskCommentWithAuthor,
} from "@/lib/supabase/types";

type ProjectWithClient = Project & { clients: Client | null };

const DEFAULT_SECTION_NAMES = ["To do", "In Progress", "Review", "Done"];

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: project }, { data: profiles }, { data: sections }, { data: clients }, { data: runningEntry }] =
    await Promise.all([
      supabase.from("projects").select("*, clients(*)").eq("id", id).maybeSingle(),
      supabase.from("profiles").select("*").order("name"),
      supabase.from("sections").select("*").eq("project_id", id).order("position"),
      supabase.from("clients").select("*").order("name"),
      supabase
        .from("time_entries")
        .select("*, projects(name), tasks(title)")
        .eq("user_id", profile.id)
        .is("ended_at", null)
        .maybeSingle(),
    ]);

  if (!project) notFound();

  let projectSections = (sections as Section[]) ?? [];
  if (projectSections.length === 0) {
    const { data: seeded } = await supabase
      .from("sections")
      .insert(DEFAULT_SECTION_NAMES.map((name, position) => ({ project_id: id, name, position })))
      .select("*");
    projectSections = (seeded as Section[]) ?? [];
  }

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("project_id", id)
    .order("position");

  const projectTasks = (tasks as Task[]) ?? [];
  const taskIds = projectTasks.map((t) => t.id);
  const [{ data: comments }, { data: taskAssignees }] =
    taskIds.length > 0
      ? await Promise.all([
          supabase.from("task_comments").select("*, profiles(name)").in("task_id", taskIds),
          supabase.from("task_assignees").select("*").in("task_id", taskIds),
        ])
      : [{ data: [] }, { data: [] }];

  const projectWithClient = project as ProjectWithClient;
  const allProfiles = (profiles as Profile[]) ?? [];

  return (
    <ProjectDetailView
      project={projectWithClient}
      client={projectWithClient.clients}
      allClients={(clients as Client[]) ?? []}
      allProfiles={allProfiles}
      sections={projectSections}
      tasks={projectTasks}
      taskAssignees={(taskAssignees as TaskAssignee[]) ?? []}
      comments={(comments as TaskCommentWithAuthor[]) ?? []}
      isAdmin={profile.role === "admin"}
      currentUser={{ id: profile.id, name: profile.name }}
      runningEntry={runningEntry as RunningTimeEntry | null}
    />
  );
}
