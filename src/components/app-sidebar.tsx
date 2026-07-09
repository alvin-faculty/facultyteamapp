"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { projectDotColorClass } from "@/lib/project-color"
import { cn } from "@/lib/utils"
import { BarChart3Icon, FolderKanbanIcon, ListChecksIcon, SettingsIcon } from "lucide-react"

const NAV_ITEMS = [
  { href: "/", label: "Project Overview", icon: FolderKanbanIcon },
  { href: "/my-tasks", label: "My Tasks", icon: ListChecksIcon },
]

const ADMIN_NAV_ITEMS = [
  { href: "/tracked-time", label: "Tracked Time", icon: BarChart3Icon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
]

const NAV_BUTTON_CLASSES =
  "text-xs font-medium data-active:bg-primary data-active:text-primary-foreground hover:data-active:bg-primary hover:data-active:text-primary-foreground"

export function AppSidebar({
  user,
  projects,
  isAdmin,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: { name: string; email: string }
  projects: { id: string; name: string; color: string | null; clients: { id: string; name: string } | null }[]
  isAdmin: boolean
}) {
  const pathname = usePathname()
  const navItems = isAdmin ? [...NAV_ITEMS, ...ADMIN_NAV_ITEMS] : NAV_ITEMS

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex h-10 items-center px-2 group-data-[collapsible=icon]:justify-center">
          <span className="text-[10px] font-bold tracking-[0.35em] uppercase group-data-[collapsible=icon]:hidden">
            Faculty Team
          </span>
          <span className="hidden text-[10px] font-bold uppercase group-data-[collapsible=icon]:block">
            FT
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] tracking-[0.05em] uppercase">
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    isActive={href === "/" ? pathname === "/" : pathname.startsWith(href)}
                    tooltip={label}
                    className={NAV_BUTTON_CLASSES}
                    render={<Link href={href} />}
                  >
                    <Icon />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] tracking-[0.05em] uppercase">
            Projects
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {projects.map((project) => {
                const href = `/projects/${project.id}`
                const label = project.clients ? `${project.clients.name} — ${project.name}` : project.name
                return (
                  <SidebarMenuItem key={project.id}>
                    <SidebarMenuButton
                      isActive={pathname === href}
                      tooltip={label}
                      className={NAV_BUTTON_CLASSES}
                      render={<Link href={href} />}
                    >
                      <span
                        className={cn(
                          "size-2 shrink-0 rounded-full",
                          projectDotColorClass(project.color, project.clients?.id ?? null),
                        )}
                      />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
