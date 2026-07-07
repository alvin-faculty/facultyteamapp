import Link from "next/link";
import { ProjectBudgetBar } from "@/components/ProjectBudgetBar";
import { clientBorderColorClass, clientColorClass } from "@/lib/client-color";
import { profileColorClass } from "@/lib/profile-color";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Client, Profile, Project } from "@/lib/supabase/types";

function dateRangeLabel(startDate: string | null, endDate: string | null): string | null {
  if (startDate && endDate) return `${formatDate(startDate)} – ${formatDate(endDate)}`;
  if (endDate) return `Due ${formatDate(endDate)}`;
  if (startDate) return `Started ${formatDate(startDate)}`;
  return null;
}

export function ProjectChip({
  project,
  client,
  usedMinutes,
  usedAmount,
  team,
}: {
  project: Project;
  client: Client | null;
  usedMinutes: number;
  usedAmount: number;
  team: Profile[];
}) {
  const dateRange = dateRangeLabel(project.start_date, project.end_date);

  return (
    <Link href={`/projects/${project.id}`} className="block">
      <div
        className={cn(
          "cursor-pointer rounded-xl border border-l-4 bg-card transition-colors hover:bg-muted/40",
          client ? clientBorderColorClass(client.id) : "border-l-muted-foreground",
        )}
      >
        <div className="space-y-3 px-4 py-3">
          {/* Title + status pill */}
          <div className="flex items-start justify-between gap-2">
            <p className="text-[13px] font-semibold">{project.name}</p>
            <span className="rounded-full bg-muted px-1.5 py-px text-[9px] font-semibold tracking-wide text-muted-foreground uppercase">
              {project.status}
            </span>
          </div>

          <ProjectBudgetBar
            usedMinutes={usedMinutes}
            budgetHours={project.budget_hours}
            usedAmount={usedAmount}
            budgetAmount={project.budget_amount}
          />

          {/* Meta line: client · dates · team dots */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5 text-[10px] text-muted-foreground">
              {client && (
                <span className={cn("size-2 shrink-0 rounded-full", clientColorClass(client.id))} />
              )}
              <span className="truncate">
                {client?.name ?? "—"}
                {dateRange && ` · ${dateRange}`}
              </span>
            </div>
            {team.length > 0 && (
              <div className="flex shrink-0 items-center gap-1">
                {team.map((profile) => (
                  <span
                    key={profile.id}
                    title={profile.name}
                    className={cn("size-2 rounded-full", profileColorClass(profile.id))}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
