"use client";

import type { ReactNode, ChangeEvent } from "react";
import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KanbanBoard } from "@/components/KanbanBoard";
import { EditProjectDialog } from "@/components/EditProjectDialog";
import {
  updateProjectBudgetHours,
  updateProjectDropboxUrl,
  updateProjectNumber,
  uploadProposalScope,
} from "@/lib/actions/projects";
import { ArrowLeft, ExternalLinkIcon, FileImageIcon } from "lucide-react";
import type { Client, Profile, Project, Section, Task, TaskAssignee, TaskCommentWithAuthor } from "@/lib/supabase/types";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">{label}</p>
      {children}
    </div>
  );
}

function ProjectInfoBox({ project, client, isAdmin }: { project: Project; client: Client | null; isAdmin: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [budgetHours, setBudgetHours] = useState(project.budget_hours?.toString() ?? "");
  const [projectNumber, setProjectNumber] = useState(project.project_number ?? "");
  const [dropboxUrl, setDropboxUrl] = useState(project.dropbox_folder_url ?? "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function saveBudgetHours() {
    const parsed = budgetHours.trim() === "" ? null : Number(budgetHours);
    startTransition(async () => {
      try {
        await updateProjectBudgetHours(project.id, Number.isFinite(parsed as number) ? parsed : null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update budgeted hours");
      }
    });
  }

  function saveProjectNumber() {
    startTransition(async () => {
      try {
        await updateProjectNumber(project.id, projectNumber.trim());
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update project number");
      }
    });
  }

  function saveDropboxUrl() {
    startTransition(async () => {
      try {
        await updateProjectDropboxUrl(project.id, dropboxUrl.trim());
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update Dropbox link");
      }
    });
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      try {
        await uploadProposalScope(project.id, formData);
        toast.success("Proposal scope uploaded");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to upload proposal scope");
      }
    });
    e.target.value = "";
  }

  return (
    <Card>
      <CardContent className="grid grid-cols-2 gap-4 py-4 md:grid-cols-3">
        {isAdmin && (
          <Field label="Total budgeted hours">
            <Input
              type="number"
              min="0"
              step="0.5"
              value={budgetHours}
              onChange={(e) => setBudgetHours(e.target.value)}
              onBlur={saveBudgetHours}
              disabled={isPending}
              placeholder="—"
            />
          </Field>
        )}

        <Field label="Proposal scope">
          <div className="flex items-center gap-2">
            {project.proposal_scope_url ? (
              <a
                href={project.proposal_scope_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <FileImageIcon className="size-3.5" />
                View proposal scope
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">No file uploaded.</p>
            )}
            <Button
              type="button"
              variant="outline"
              size="xs"
              disabled={isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              {project.proposal_scope_url ? "Replace" : "Upload"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </Field>

        <Field label="Client">
          <p className="text-sm">{client?.name ?? "—"}</p>
        </Field>

        <Field label="Client email">
          <p className="text-sm">{client?.contact_email ?? "—"}</p>
        </Field>

        <Field label="Project number">
          <Input
            value={projectNumber}
            onChange={(e) => setProjectNumber(e.target.value)}
            onBlur={saveProjectNumber}
            disabled={isPending}
            placeholder="—"
          />
        </Field>

        <Field label="Dropbox folder">
          <div className="flex items-center gap-2">
            <Input
              value={dropboxUrl}
              onChange={(e) => setDropboxUrl(e.target.value)}
              onBlur={saveDropboxUrl}
              disabled={isPending}
              placeholder="https://dropbox.com/…"
            />
            {project.dropbox_folder_url && (
              <a
                href={project.dropbox_folder_url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                <ExternalLinkIcon className="size-4" />
              </a>
            )}
          </div>
        </Field>
      </CardContent>
    </Card>
  );
}

export function ProjectDetailView({
  project,
  client,
  allClients,
  allProfiles,
  sections,
  tasks,
  taskAssignees,
  comments,
  isAdmin,
}: {
  project: Project;
  client: Client | null;
  allClients: Client[];
  allProfiles: Profile[];
  sections: Section[];
  tasks: Task[];
  taskAssignees: TaskAssignee[];
  comments: TaskCommentWithAuthor[];
  isAdmin: boolean;
}) {
  return (
    <div className="col-span-12 space-y-6">
      <Link href="/" className={buttonVariants({ variant: "ghost", size: "sm" })}>
        <ArrowLeft className="size-4" />
        Project Overview
      </Link>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">
            {client ? `${client.name} — ${project.name}` : project.name}
          </h1>
          <span className="rounded-full bg-muted px-1.5 py-px text-[9px] font-semibold tracking-wide text-muted-foreground uppercase">
            {project.status}
          </span>
        </div>
        <EditProjectDialog project={project} clients={allClients} />
      </div>

      <ProjectInfoBox project={project} client={client} isAdmin={isAdmin} />

      <KanbanBoard
        projectId={project.id}
        sections={sections}
        tasks={tasks}
        profiles={allProfiles}
        taskAssignees={taskAssignees}
        comments={comments}
      />
    </div>
  );
}
