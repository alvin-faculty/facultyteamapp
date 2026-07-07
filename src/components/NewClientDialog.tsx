"use client";

import { useState, useTransition } from "react";
import { createClientRecord } from "@/lib/actions/clients";
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

export function NewClientDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <Plus className="size-4" />
            New client
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New client</DialogTitle>
        </DialogHeader>
        <form
          action={(formData) =>
            startTransition(async () => {
              await createClientRecord(formData);
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
            <Label htmlFor="contact_name">Contact name</Label>
            <Input id="contact_name" name="contact_name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact_email">Contact email</Label>
            <Input id="contact_email" name="contact_email" type="email" />
          </div>
          <Button type="submit" disabled={isPending} className="w-full">
            Create client
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
