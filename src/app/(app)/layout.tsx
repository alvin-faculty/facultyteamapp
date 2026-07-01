import Link from "next/link";
import { requireProfile } from "@/lib/current-user";
import { logout } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Toaster } from "@/components/ui/sonner";
import { LayoutDashboard, Users, FolderKanban, Timer, Receipt } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/time", label: "Time", icon: Timer },
  { href: "/billing", label: "Billing", icon: Receipt },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  const initials = profile.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col border-r bg-muted/20 p-4">
        <div className="mb-6 px-2 text-lg font-semibold">Faculty Team</div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 border-t pt-4">
          <Avatar className="size-8">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{profile.name}</p>
          </div>
          <form action={logout}>
            <Button variant="ghost" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
      <Toaster />
    </div>
  );
}
