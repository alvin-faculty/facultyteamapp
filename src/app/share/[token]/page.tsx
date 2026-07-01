import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import type { Task, TaskStatus } from "@/lib/supabase/types";

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "todo", label: "To do" },
  { status: "in_progress", label: "In progress" },
  { status: "review", label: "Review" },
  { status: "done", label: "Done" },
];

export default async function SharedProjectPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createServiceRoleClient();

  const { data: project } = await supabase
    .from("projects")
    .select("*, clients(name)")
    .eq("share_token", token)
    .single();

  if (!project) notFound();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("project_id", project.id)
    .order("position");

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <div>
        <p className="text-sm text-muted-foreground">{project.clients?.name}</p>
        <h1 className="text-2xl font-semibold">{project.name}</h1>
        <Badge variant="outline" className="mt-2 capitalize">
          {project.status}
        </Badge>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {COLUMNS.map((col) => (
          <div key={col.status} className="flex w-64 shrink-0 flex-col gap-2 rounded-lg border p-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-sm font-medium">{col.label}</span>
              <span className="text-xs text-muted-foreground">
                {(tasks as Task[] | null)?.filter((t) => t.status === col.status).length ?? 0}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {(tasks as Task[] | null)
                ?.filter((t) => t.status === col.status)
                .map((task) => (
                  <Card key={task.id} className="py-3">
                    <CardContent className="space-y-1 px-3">
                      <p className="text-sm font-medium">{task.title}</p>
                      {task.due_date && (
                        <p className="text-xs text-muted-foreground">Due {formatDate(task.due_date)}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        ))}
      </div>

      {(project.asset_links?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Files</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {project.asset_links.map((link: { label: string; url: string }, i: number) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-primary hover:underline"
              >
                {link.label}
              </a>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
