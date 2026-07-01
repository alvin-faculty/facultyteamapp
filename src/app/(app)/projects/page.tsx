import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Project, ProjectStatus } from "@/lib/supabase/types";

type ProjectWithClient = Project & { clients: { name: string } | null };

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  proposal: "outline",
  active: "default",
  review: "secondary",
  done: "secondary",
  archived: "outline",
};

const STATUSES: ProjectStatus[] = ["proposal", "active", "review", "done", "archived"];

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("projects")
    .select("*, clients(name)")
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data } = await query;
  const projects = data as ProjectWithClient[] | null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Projects</h1>

      <div className="flex flex-wrap gap-2">
        <Link href="/projects">
          <Badge variant={!status ? "default" : "outline"} className="cursor-pointer">
            All
          </Badge>
        </Link>
        {STATUSES.map((s) => (
          <Link key={s} href={`/projects?status=${s}`}>
            <Badge variant={status === s ? "default" : "outline"} className="cursor-pointer">
              {s}
            </Badge>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects?.map((project) => (
          <Link key={project.id} href={`/projects/${project.id}`}>
            <Card className="h-full transition-colors hover:bg-muted/40">
              <CardContent className="space-y-2 py-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{project.name}</span>
                  <Badge variant={STATUS_VARIANT[project.status]}>{project.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{project.clients?.name}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
        {projects?.length === 0 && (
          <p className="col-span-full text-sm text-muted-foreground">No projects match this filter.</p>
        )}
      </div>
    </div>
  );
}
