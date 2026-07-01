import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/current-user";
import { createManualEntry } from "@/lib/actions/time-entries";
import { TimerWidget } from "@/components/TimerWidget";
import { TimeEntryTable } from "@/components/TimeEntryTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { Task, TimeEntry } from "@/lib/supabase/types";

export default async function TimePage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: runningEntry }, { data: projects }, { data: tasks }] = await Promise.all([
    supabase
      .from("time_entries")
      .select("*, projects(name)")
      .eq("user_id", profile.id)
      .is("ended_at", null)
      .maybeSingle(),
    supabase.from("projects").select("id, name").order("name"),
    supabase.from("tasks").select("*").order("title"),
  ]);

  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const { data: weekEntries } = await supabase
    .from("time_entries")
    .select("*, projects(name)")
    .eq("user_id", profile.id)
    .not("ended_at", "is", null)
    .gte("started_at", startOfWeek.toISOString())
    .order("started_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Time tracking</h1>
        <Dialog>
          <DialogTrigger
            render={
              <Button variant="outline">
                <Plus className="size-4" />
                Log time manually
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log time manually</DialogTitle>
            </DialogHeader>
            <form action={createManualEntry} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project_id">Project</Label>
                <Select name="project_id" required>
                  <SelectTrigger id="project_id" className="w-full">
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hours">Hours</Label>
                  <Input id="hours" name="hours" type="number" step="0.25" min="0.25" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" name="description" />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="billable" name="billable" defaultChecked />
                <Label htmlFor="billable" className="font-normal">
                  Billable
                </Label>
              </div>
              <Button type="submit" className="w-full">
                Add entry
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <TimerWidget
        runningEntry={runningEntry as (TimeEntry & { projects: { name: string } | null }) | null}
        projects={projects ?? []}
        tasks={(tasks as Task[]) ?? []}
      />

      <div className="space-y-3">
        <h2 className="text-lg font-medium">This week</h2>
        <TimeEntryTable entries={weekEntries ?? []} showProject />
      </div>
    </div>
  );
}
