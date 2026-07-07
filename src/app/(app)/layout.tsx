import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/current-user";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, clients(id, name)")
    .order("name");

  return (
    <SidebarProvider>
      <AppSidebar
        user={{ name: profile.name, email: profile.email }}
        projects={
          (projects as unknown as {
            id: string;
            name: string;
            clients: { id: string; name: string } | null;
          }[]) ?? []
        }
      />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4" />
        </header>
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-8">
          <div className="mx-auto grid max-w-7xl grid-cols-12 gap-6">{children}</div>
        </main>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}
