import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProjectBudgetBar } from "@/components/ProjectBudgetBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatMinutes } from "@/lib/format";
import type { Profile, Project, TimeEntry } from "@/lib/supabase/types";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const [{ data: profiles }, { data: weekEntries }, { data: runningEntries }, { data: activeProjects }] =
    await Promise.all([
      supabase.from("profiles").select("*").order("name"),
      supabase
        .from("time_entries")
        .select("*")
        .not("ended_at", "is", null)
        .gte("started_at", startOfWeek.toISOString()),
      supabase.from("time_entries").select("*, profiles(name), projects(name)").is("ended_at", null),
      supabase.from("projects").select("*, clients(name)").eq("status", "active"),
    ]);

  const minutesByUser = new Map<string, number>();
  for (const entry of (weekEntries as TimeEntry[]) ?? []) {
    minutesByUser.set(entry.user_id, (minutesByUser.get(entry.user_id) ?? 0) + (entry.duration_minutes ?? 0));
  }

  const projectStats = await Promise.all(
    (activeProjects ?? []).map(async (project) => {
      const { data: entries } = await supabase
        .from("time_entries")
        .select("duration_minutes, billable, rate_snapshot")
        .eq("project_id", project.id)
        .not("ended_at", "is", null);

      const usedMinutes = (entries ?? []).reduce((sum, e) => sum + (e.duration_minutes ?? 0), 0);
      const usedAmount = (entries ?? [])
        .filter((e) => e.billable)
        .reduce((sum, e) => sum + ((e.duration_minutes ?? 0) / 60) * e.rate_snapshot, 0);

      return { project, usedMinutes, usedAmount };
    }),
  );

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Hours this week</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(profiles as Profile[])?.map((profile) => (
              <div key={profile.id} className="flex items-center gap-3">
                <Avatar className="size-8">
                  <AvatarFallback className="text-xs">{initials(profile.name)}</AvatarFallback>
                </Avatar>
                <span className="flex-1 text-sm">{profile.name}</span>
                <span className="text-sm text-muted-foreground">
                  {formatMinutes(minutesByUser.get(profile.id) ?? 0)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Active timers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {runningEntries?.length === 0 && (
              <p className="text-sm text-muted-foreground">No one is tracking time right now.</p>
            )}
            {runningEntries?.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between text-sm">
                <span className="font-medium">{entry.profiles?.name}</span>
                <span className="text-muted-foreground">{entry.projects?.name}</span>
                <Badge variant="secondary">Running</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-medium">Active project budgets</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {projectStats.map(({ project, usedMinutes, usedAmount }) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="h-full transition-colors hover:bg-muted/40">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">
                    {project.name}
                    <span className="ml-2 font-normal text-muted-foreground">
                      {(project as Project & { clients: { name: string } | null }).clients?.name}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ProjectBudgetBar
                    usedMinutes={usedMinutes}
                    budgetHours={project.budget_hours}
                    usedAmount={usedAmount}
                    budgetAmount={project.budget_amount}
                  />
                </CardContent>
              </Card>
            </Link>
          ))}
          {projectStats.length === 0 && (
            <p className="text-sm text-muted-foreground">No active projects yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
