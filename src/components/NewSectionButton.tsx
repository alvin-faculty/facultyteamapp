"use client";

import { useState, useTransition } from "react";
import { createSection } from "@/lib/actions/sections";
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
import { Plus } from "lucide-react";

export function NewSectionButton({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" className="h-10 w-72 shrink-0 self-start justify-start text-muted-foreground">
            <Plus className="size-4" />
            New column
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New column</DialogTitle>
        </DialogHeader>
        <form
          action={(formData) =>
            startTransition(async () => {
              await createSection(projectId, String(formData.get("name")));
              setOpen(false);
            })
          }
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required autoFocus />
          </div>
          <Button type="submit" disabled={isPending} className="w-full">
            Create column
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
