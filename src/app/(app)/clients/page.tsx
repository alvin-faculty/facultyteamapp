import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createClientRecord } from "@/lib/actions/clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: clients } = await supabase.from("clients").select("*").order("name");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clients</h1>
        <Dialog>
          <DialogTrigger
            render={
              <Button>
                <Plus className="size-4" />
                New client
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New client</DialogTitle>
            </DialogHeader>
            <form action={createClientRecord} className="space-y-4">
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
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" />
              </div>
              <Button type="submit" className="w-full">
                Create client
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {clients?.map((client) => (
          <Link key={client.id} href={`/clients/${client.id}`}>
            <Card className="h-full transition-colors hover:bg-muted/40">
              <CardHeader>
                <CardTitle className="text-base">{client.name}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {client.contact_name && <p>{client.contact_name}</p>}
                {client.contact_email && <p>{client.contact_email}</p>}
              </CardContent>
            </Card>
          </Link>
        ))}
        {clients?.length === 0 && (
          <p className="col-span-full text-sm text-muted-foreground">
            No clients yet — add your first one.
          </p>
        )}
      </div>
    </div>
  );
}
