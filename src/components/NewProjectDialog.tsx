"use client";

import { useState, useTransition } from "react";
import { createProject } from "@/lib/actions/projects";
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
import { Plus } from "lucide-react";
import type { Client } from "@/lib/supabase/types";

export function NewProjectDialog({ clients }: { clients: Client[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus className="size-4" />
            New project
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
        </DialogHeader>
        {clients.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No clients yet — create one first with the &ldquo;New client&rdquo; button.
          </p>
        ) : (
          <form
            action={(formData) =>
              startTransition(async () => {
                await createProject(formData);
                setOpen(false);
              })
            }
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client_id">Client</Label>
              <Select
                name="client_id"
                defaultValue={clients[0]?.id}
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
                defaultValue="proposal"
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
            <Button type="submit" disabled={isPending} className="w-full">
              Create project
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
