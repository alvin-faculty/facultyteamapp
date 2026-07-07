import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/current-user";
import { ProjectDetailView } from "@/components/ProjectDetailView";
import type {
  Client,
  Profile,
  Project,
  ProjectMember,
  Section,
  Task,
  TaskCommentWithAuthor,
} from "@/lib/supabase/types";

type ProjectWithClient = Project & { clients: Client | null };

interface TimeEntryAgg {
  duration_minutes: number | null;
  billable: boolean;
  rate_snapshot: number;
}

const DEFAULT_SECTION_NAMES = ["To do", "In Progress", "Review", "Done"];

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: project }, { data: timeEntries }, { data: profiles }, { data: members }, { data: sections }] =
    await Promise.all([
      supabase.from("projects").select("*, clients(*)").eq("id", id).maybeSingle(),
      supabase
        .from("time_entries")
        .select("duration_minutes, billable, rate_snapshot")
        .eq("project_id", id)
        .not("ended_at", "is", null),
      supabase.from("profiles").select("*").order("name"),
      supabase.from("project_members").select("*").eq("project_id", id),
      supabase.from("sections").select("*").eq("project_id", id).order("position"),
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
  const { data: comments } =
    taskIds.length > 0
      ? await supabase.from("task_comments").select("*, profiles(name)").in("task_id", taskIds)
      : { data: [] };

  const projectWithClient = project as ProjectWithClient;
  const entries = (timeEntries as TimeEntryAgg[]) ?? [];
  const usedMinutes = entries.reduce((sum, e) => sum + (e.duration_minutes ?? 0), 0);
  const usedAmount = entries
    .filter((e) => e.billable)
    .reduce((sum, e) => sum + ((e.duration_minutes ?? 0) / 60) * e.rate_snapshot, 0);

  const allProfiles = (profiles as Profile[]) ?? [];
  const assignedIds = ((members as ProjectMember[]) ?? []).map((m) => m.user_id);

  return (
    <ProjectDetailView
      project={projectWithClient}
      client={projectWithClient.clients}
      usedMinutes={usedMinutes}
      usedAmount={usedAmount}
      allProfiles={allProfiles}
      assignedIds={assignedIds}
      sections={projectSections}
      tasks={projectTasks}
      comments={(comments as TaskCommentWithAuthor[]) ?? []}
      isAdmin={profile.role === "admin"}
    />
  );
}
