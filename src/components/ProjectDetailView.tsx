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
import type { RunningTimeEntry } from "@/lib/actions/time-entries";
import { ArrowLeft, ExternalLinkIcon, FileImageIcon, PencilIcon } from "lucide-react";
import type { Client, Profile, Project, Section, Task, TaskAssignee, TaskCommentWithAuthor } from "@/lib/supabase/types";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">{label}</p>
      {children}
    </div>
  );
}

function EditableField({
  label,
  value,
  displayValue,
  onSave,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  displayValue?: ReactNode;
  onSave: (value: string) => Promise<void>;
  type?: string;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      try {
        await onSave(draft);
        setEditing(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  return (
    <Field label={label}>
      {editing ? (
        <Input
          type={type}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => e.key === "Enter" && save()}
          disabled={isPending}
          placeholder={placeholder}
          autoFocus
        />
      ) : (
        <div className="flex min-w-0 items-center gap-1.5">
          <div className="min-w-0 truncate text-sm">{displayValue ?? (value.trim() ? value : <span className="text-muted-foreground">—</span>)}</div>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => {
              setDraft(value);
              setEditing(true);
            }}
          >
            <PencilIcon className="size-3" />
          </Button>
        </div>
      )}
    </Field>
  );
}

function ProjectInfoBox({ project, client, isAdmin }: { project: Project; client: Client | null; isAdmin: boolean }) {
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          <EditableField
            label="Total budgeted hours"
            value={project.budget_hours?.toString() ?? ""}
            type="number"
            placeholder="—"
            onSave={(v) =>
              updateProjectBudgetHours(project.id, v.trim() === "" ? null : Number(v))
            }
          />
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
              variant="ghost"
              size="icon-xs"
              disabled={isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              <PencilIcon className="size-3" />
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

        <EditableField
          label="Project number"
          value={project.project_number ?? ""}
          placeholder="—"
          onSave={(v) => updateProjectNumber(project.id, v.trim())}
        />

        <EditableField
          label="Dropbox folder"
          value={project.dropbox_folder_url ?? ""}
          placeholder="https://dropbox.com/…"
          displayValue={
            project.dropbox_folder_url ? (
              <a
                href={project.dropbox_folder_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline"
              >
                <ExternalLinkIcon className="size-3.5" />
                {project.dropbox_folder_url}
              </a>
            ) : undefined
          }
          onSave={(v) => updateProjectDropboxUrl(project.id, v.trim())}
        />
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
  currentUser,
  runningEntry,
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
  currentUser: { id: string; name: string };
  runningEntry: RunningTimeEntry | null;
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
        currentUser={currentUser}
        runningEntry={runningEntry}
      />
    </div>
  );
}
