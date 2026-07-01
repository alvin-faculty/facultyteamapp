import { createClient } from "@/lib/supabase/server";
import { BillingResults } from "@/components/BillingResults";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TimeEntry } from "@/lib/supabase/types";

type BillingEntry = TimeEntry & { profiles: { name: string } | null; projects: { name: string } | null };

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ client_id?: string; project_id?: string; start?: string; end?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const { data: clients } = await supabase.from("clients").select("*").order("name");
  const { data: allProjects } = await supabase.from("projects").select("id, name, client_id").order("name");

  const clientId = params.client_id || clients?.[0]?.id || "";
  const projectId = params.project_id && params.project_id !== "all" ? params.project_id : "";
  const start = params.start || startOfMonth();
  const end = params.end || today();

  const projectsForClient = (allProjects ?? []).filter((p) => p.client_id === clientId);

  let projectIds: string[];
  if (projectId) {
    projectIds = [projectId];
  } else {
    projectIds = projectsForClient.map((p) => p.id);
  }

  const { data: entries } = clientId && projectIds.length
    ? await supabase
        .from("time_entries")
        .select("*, profiles(name), projects(name)")
        .in("project_id", projectIds)
        .eq("billable", true)
        .not("ended_at", "is", null)
        .gte("started_at", `${start}T00:00:00`)
        .lte("started_at", `${end}T23:59:59`)
        .order("started_at")
    : { data: [] };

  const client = clients?.find((c) => c.id === clientId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Billing export</h1>

      <Card>
        <CardContent className="pt-6">
          <form method="GET" className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="client_id">Client</Label>
              <Select name="client_id" defaultValue={clientId}>
                <SelectTrigger id="client_id" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {clients?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project_id">Project</Label>
              <Select name="project_id" defaultValue={projectId || "all"}>
                <SelectTrigger id="project_id" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All projects</SelectItem>
                  {projectsForClient.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="start">Start date</Label>
              <Input id="start" name="start" type="date" defaultValue={start} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">End date</Label>
              <Input id="end" name="end" type="date" defaultValue={end} />
            </div>
            <Button type="submit" className="col-span-2 sm:col-span-4">
              Apply filters
            </Button>
          </form>
        </CardContent>
      </Card>

      {client && (
        <BillingResults
          entries={(entries as BillingEntry[]) ?? []}
          clientId={clientId}
          clientName={client.name}
          projectId={projectId || null}
          startDate={start}
          endDate={end}
        />
      )}
    </div>
  );
}
