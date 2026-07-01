import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateClientRecord } from "@/lib/actions/clients";
import { createProject } from "@/lib/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  proposal: "outline",
  active: "default",
  review: "secondary",
  done: "secondary",
  archived: "outline",
};

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: client } = await supabase.from("clients").select("*").eq("id", id).single();
  if (!client) notFound();

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("client_id", id)
    .order("created_at", { ascending: false });

  const updateAction = updateClientRecord.bind(null, id);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/clients" className="text-sm text-muted-foreground hover:underline">
          ← Clients
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{client.name}</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Client info</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" defaultValue={client.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_name">Contact name</Label>
                <Input id="contact_name" name="contact_name" defaultValue={client.contact_name ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_email">Contact email</Label>
                <Input
                  id="contact_email"
                  name="contact_email"
                  type="email"
                  defaultValue={client.contact_email ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" defaultValue={client.notes ?? ""} />
              </div>
              <Button type="submit" variant="secondary" className="w-full">
                Save changes
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Projects</h2>
            <Dialog>
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
                  <DialogTitle>New project for {client.name}</DialogTitle>
                </DialogHeader>
                <form action={createProject} className="space-y-4">
                  <input type="hidden" name="client_id" value={client.id} />
                  <div className="space-y-2">
                    <Label htmlFor="p_name">Project name</Label>
                    <Input id="p_name" name="name" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select name="status" defaultValue="proposal">
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
                      <Label htmlFor="budget_hours">Budget (hours)</Label>
                      <Input id="budget_hours" name="budget_hours" type="number" step="0.5" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="budget_amount">Budget ($)</Label>
                      <Input id="budget_amount" name="budget_amount" type="number" step="1" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start_date">Start date</Label>
                      <Input id="start_date" name="start_date" type="date" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end_date">End date</Label>
                      <Input id="end_date" name="end_date" type="date" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hourly_rate_override">Hourly rate override ($)</Label>
                    <Input id="hourly_rate_override" name="hourly_rate_override" type="number" step="1" />
                  </div>
                  <Button type="submit" className="w-full">
                    Create project
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-2">
            {projects?.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="transition-colors hover:bg-muted/40">
                  <CardContent className="flex items-center justify-between py-4">
                    <span className="font-medium">{project.name}</span>
                    <Badge variant={STATUS_VARIANT[project.status]}>{project.status}</Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
            {projects?.length === 0 && (
              <p className="text-sm text-muted-foreground">No projects yet for this client.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
