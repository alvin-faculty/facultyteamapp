import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateProjectDetails } from "@/lib/actions/projects";
import { ProjectStatusSelect } from "@/components/ProjectStatusSelect";
import { ProjectBudgetBar } from "@/components/ProjectBudgetBar";
import { KanbanBoard } from "@/components/KanbanBoard";
import { TimeEntryTable } from "@/components/TimeEntryTable";
import { AssetLinksSection } from "@/components/AssetLinksSection";
import { ShareLinkBox } from "@/components/ShareLinkBox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { AssetLink, Profile, Task, TaskComment, TimeEntry } from "@/lib/supabase/types";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("*, clients(id, name)")
    .eq("id", id)
    .single();
  if (!project) notFound();

  const [{ data: tasks }, { data: profiles }, { data: timeEntries }] = await Promise.all([
    supabase.from("tasks").select("*").eq("project_id", id).order("position"),
    supabase.from("profiles").select("*").order("name"),
    supabase
      .from("time_entries")
      .select("*, profiles(name)")
      .eq("project_id", id)
      .not("ended_at", "is", null)
      .order("started_at", { ascending: false }),
  ]);

  const taskIds = (tasks ?? []).map((t) => t.id);
  const { data: comments } = taskIds.length
    ? await supabase
        .from("task_comments")
        .select("*, profiles(name)")
        .in("task_id", taskIds)
        .order("created_at")
    : { data: [] as TaskComment[] };

  const entries = (timeEntries ?? []) as (TimeEntry & { profiles: { name: string } | null })[];
  const usedMinutes = entries.reduce((sum, e) => sum + (e.duration_minutes ?? 0), 0);
  const usedAmount = entries
    .filter((e) => e.billable)
    .reduce((sum, e) => sum + ((e.duration_minutes ?? 0) / 60) * e.rate_snapshot, 0);

  const updateAction = updateProjectDetails.bind(null, id);
  const client = (project as unknown as { clients: { id: string; name: string } }).clients;

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/clients/${client.id}`} className="text-sm text-muted-foreground hover:underline">
          ← {client.name}
        </Link>
        <div className="mt-1 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          <ProjectStatusSelect projectId={project.id} status={project.status} />
        </div>
      </div>

      <ProjectBudgetBar
        usedMinutes={usedMinutes}
        budgetHours={project.budget_hours}
        usedAmount={usedAmount}
        budgetAmount={project.budget_amount}
      />

      <Tabs defaultValue="board">
        <TabsList>
          <TabsTrigger value="board">Board</TabsTrigger>
          <TabsTrigger value="time">Time log</TabsTrigger>
          <TabsTrigger value="details">Details & files</TabsTrigger>
        </TabsList>

        <TabsContent value="board" className="pt-4">
          <KanbanBoard
            projectId={project.id}
            tasks={(tasks as Task[]) ?? []}
            profiles={(profiles as Profile[]) ?? []}
            comments={comments ?? []}
          />
        </TabsContent>

        <TabsContent value="time" className="pt-4">
          <TimeEntryTable entries={entries} />
        </TabsContent>

        <TabsContent value="details" className="grid grid-cols-1 gap-6 pt-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Project details</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={updateAction} className="space-y-4">
                <input type="hidden" name="status" value={project.status} />
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" defaultValue={project.name} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="budget_hours">Budget (hours)</Label>
                    <Input
                      id="budget_hours"
                      name="budget_hours"
                      type="number"
                      step="0.5"
                      defaultValue={project.budget_hours ?? ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="budget_amount">Budget ($)</Label>
                    <Input
                      id="budget_amount"
                      name="budget_amount"
                      type="number"
                      step="1"
                      defaultValue={project.budget_amount ?? ""}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start date</Label>
                    <Input id="start_date" name="start_date" type="date" defaultValue={project.start_date ?? ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_date">End date</Label>
                    <Input id="end_date" name="end_date" type="date" defaultValue={project.end_date ?? ""} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hourly_rate_override">Hourly rate override ($)</Label>
                  <Input
                    id="hourly_rate_override"
                    name="hourly_rate_override"
                    type="number"
                    step="1"
                    defaultValue={project.hourly_rate_override ?? ""}
                  />
                </div>
                <Button type="submit" variant="secondary" className="w-full">
                  Save changes
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Files & assets</CardTitle>
              </CardHeader>
              <CardContent>
                <AssetLinksSection projectId={project.id} links={(project.asset_links as AssetLink[]) ?? []} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Client share link</CardTitle>
              </CardHeader>
              <CardContent>
                <ShareLinkBox token={project.share_token} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
