import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/current-user";
import { ProjectExplorer } from "@/components/ProjectExplorer";
import type { Client, Profile, Project, ProjectMember } from "@/lib/supabase/types";

type ProjectWithClient = Project & { clients: Client | null };

interface TimeEntryAgg {
  project_id: string;
  duration_minutes: number | null;
  billable: boolean;
  rate_snapshot: number;
  started_at: string;
}

export default async function ProjectOverviewPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: projects }, { data: timeEntries }, { data: profiles }, { data: clients }, { data: members }] =
    await Promise.all([
      supabase.from("projects").select("*, clients(*)").order("created_at", { ascending: false }),
      supabase
        .from("time_entries")
        .select("project_id, duration_minutes, billable, rate_snapshot, started_at")
        .not("ended_at", "is", null),
      supabase.from("profiles").select("*").order("name"),
      supabase.from("clients").select("*").order("name"),
      supabase.from("project_members").select("*"),
    ]);

  const projectList = (projects as ProjectWithClient[]) ?? [];
  const entries = (timeEntries as TimeEntryAgg[]) ?? [];
  const allProfiles = (profiles as Profile[]) ?? [];
  const allMembers = (members as ProjectMember[]) ?? [];

  const summaries = projectList.map((project) => {
    const projectEntries = entries.filter((e) => e.project_id === project.id);
    const usedMinutes = projectEntries.reduce((sum, e) => sum + (e.duration_minutes ?? 0), 0);
    const usedAmount = projectEntries
      .filter((e) => e.billable)
      .reduce((sum, e) => sum + ((e.duration_minutes ?? 0) / 60) * e.rate_snapshot, 0);
    const memberIds = allMembers.filter((m) => m.project_id === project.id).map((m) => m.user_id);
    const team = allProfiles.filter((p) => memberIds.includes(p.id));
    const lastActivityAt = projectEntries.reduce(
      (latest, e) => (e.started_at > latest ? e.started_at : latest),
      project.created_at,
    );

    return { project, client: project.clients, usedMinutes, usedAmount, team, lastActivityAt };
  });

  return (
    <ProjectExplorer
      summaries={summaries}
      clients={(clients as Client[]) ?? []}
      isAdmin={profile.role === "admin"}
    />
  );
}
