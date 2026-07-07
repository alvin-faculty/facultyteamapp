"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProjectBudgetBar } from "@/components/ProjectBudgetBar";
import { KanbanBoard } from "@/components/KanbanBoard";
import { assignMember, unassignMember } from "@/lib/actions/project-members";
import { formatCurrency, formatDate } from "@/lib/format";
import { profileColorClass } from "@/lib/profile-color";
import { cn } from "@/lib/utils";
import { ArrowLeft, Users } from "lucide-react";
import type { Client, Profile, Project, Section, Task, TaskCommentWithAuthor } from "@/lib/supabase/types";

export function ProjectDetailView({
  project,
  client,
  usedMinutes,
  usedAmount,
  allProfiles,
  assignedIds,
  sections,
  tasks,
  comments,
}: {
  project: Project;
  client: Client | null;
  usedMinutes: number;
  usedAmount: number;
  allProfiles: Profile[];
  assignedIds: string[];
  sections: Section[];
  tasks: Task[];
  comments: TaskCommentWithAuthor[];
}) {
  const [isPending, startTransition] = useTransition();
  const team = allProfiles.filter((p) => assignedIds.includes(p.id));

  function toggleMember(userId: string, checked: boolean) {
    startTransition(() =>
      checked ? assignMember(project.id, userId) : unassignMember(project.id, userId),
    );
  }

  return (
    <div className="col-span-12 space-y-6">
      <Link href="/" className={buttonVariants({ variant: "ghost", size: "sm" })}>
        <ArrowLeft className="size-4" />
        Project Overview
      </Link>

      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold">{project.name}</h1>
        <span className="rounded-full bg-muted px-1.5 py-px text-[9px] font-semibold tracking-wide text-muted-foreground uppercase">
          {project.status}
        </span>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 space-y-6 md:col-span-8">
          <Card>
            <CardContent className="space-y-4 py-4">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">Client</p>
                <p className="text-sm">{client?.name ?? "—"}</p>
                {client?.contact_name && <p className="text-sm text-muted-foreground">{client.contact_name}</p>}
                {client?.contact_email && (
                  <p className="text-sm text-muted-foreground">{client.contact_email}</p>
                )}
              </div>

              {(project.start_date || project.end_date) && (
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">Dates</p>
                  <p className="text-sm">
                    {project.start_date ? formatDate(project.start_date) : "—"} –{" "}
                    {project.end_date ? formatDate(project.end_date) : "—"}
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <p className="text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">Budget</p>
                <ProjectBudgetBar
                  usedMinutes={usedMinutes}
                  budgetHours={project.budget_hours}
                  usedAmount={usedAmount}
                  budgetAmount={project.budget_amount}
                />
              </div>

              {project.hourly_rate_override && (
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">Hourly rate override</p>
                  <p className="text-sm">{formatCurrency(project.hourly_rate_override)}/hr</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="col-span-12 md:col-span-4">
          <Card>
            <CardContent className="space-y-3 py-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">Team</p>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="outline" size="xs" disabled={isPending}>
                        <Users className="size-3.5" />
                        Manage team
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end">
                    {allProfiles.map((profile) => (
                      <DropdownMenuCheckboxItem
                        key={profile.id}
                        checked={assignedIds.includes(profile.id)}
                        onCheckedChange={(checked) => toggleMember(profile.id, checked === true)}
                        closeOnClick={false}
                      >
                        {profile.name}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {team.length === 0 && <p className="text-sm text-muted-foreground">No one assigned yet.</p>}

              <div className="space-y-2">
                {team.map((profile) => (
                  <div key={profile.id} className="flex items-center gap-2">
                    <span className={cn("size-2 rounded-full", profileColorClass(profile.id))} />
                    <span className="text-[13px]">{profile.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <KanbanBoard
        projectId={project.id}
        sections={sections}
        tasks={tasks}
        profiles={allProfiles}
        comments={comments}
      />
    </div>
  );
}
