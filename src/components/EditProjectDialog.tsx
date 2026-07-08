"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteProject, updateProject } from "@/lib/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROJECT_COLOR_PALETTE } from "@/lib/project-color";
import { cn } from "@/lib/utils";
import { PencilIcon, Trash2Icon } from "lucide-react";
import type { Client, Project } from "@/lib/supabase/types";

export function EditProjectDialog({ project, clients }: { project: Project; clients: Client[] }) {
  const [open, setOpen] = useState(false);
  const [color, setColor] = useState(project.color ?? "default");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (!confirm(`Delete "${project.name}"? This permanently removes its tasks, sections, and comments. This cannot be undone.`)) {
      return;
    }
    startTransition(async () => {
      try {
        await deleteProject(project.id);
        toast.success("Project deleted");
        router.push("/");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete project");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <PencilIcon className="size-3.5" />
            Edit project
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit project</DialogTitle>
        </DialogHeader>
        <form
          action={(formData) =>
            startTransition(async () => {
              formData.set("color", color);
              try {
                await updateProject(project.id, formData);
                toast.success("Project updated");
                setOpen(false);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed to update project");
              }
            })
          }
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={project.name} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client_id">Client</Label>
            <Select
              name="client_id"
              defaultValue={project.client_id}
              items={Object.fromEntries(clients.map((c) => [c.id, c.name]))}
            >
              <SelectTrigger id="client_id" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              name="status"
              defaultValue={project.status}
              items={{
                proposal: "Proposal",
                active: "Active",
                review: "Review",
                done: "Done",
                archived: "Archived",
              }}
            >
              <SelectTrigger id="status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="proposal">Proposal</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="done">Done</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
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
            <Label>Color (optional)</Label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setColor("default")}
                className={cn(
                  "flex size-6 items-center justify-center rounded-full border-2 text-[9px] text-muted-foreground",
                  color === "default" ? "border-foreground" : "border-transparent",
                )}
                title="Default (by client)"
              >
                —
              </button>
              {PROJECT_COLOR_PALETTE.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setColor(c.key)}
                  title={c.label}
                  className={cn(
                    "size-6 rounded-full border-2",
                    color === c.key ? "border-foreground" : "border-transparent",
                  )}
                >
                  <span className={cn("block size-full rounded-full", c.dot)} />
                </button>
              ))}
            </div>
          </div>
          <Button type="submit" disabled={isPending} className="w-full">
            Save changes
          </Button>
        </form>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={isPending}
          onClick={handleDelete}
          className="w-full"
        >
          <Trash2Icon className="size-3.5" />
          Delete project
        </Button>
      </DialogContent>
    </Dialog>
  );
}
