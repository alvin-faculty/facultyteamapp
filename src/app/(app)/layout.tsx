import { createClient } from '@/lib/supabase/server';
import { requireProfile } from '@/lib/current-user';
import { AppSidebar } from '@/components/app-sidebar';
import { TimerBar } from '@/components/TimerBar';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Toaster } from '@/components/ui/sonner';
import type { RunningTimeEntry } from '@/lib/actions/time-entries';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const [
    { data: projects },
    { data: tasks },
    { data: runningEntry },
    { data: myAssignedTasks },
  ] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, color, clients(id, name)')
      .order('name'),
    supabase
      .from('tasks')
      .select('id, title, project_id, billable')
      .order('title'),
    supabase
      .from('time_entries')
      .select('*, projects(name), tasks(title)')
      .eq('user_id', profile.id)
      .is('ended_at', null)
      .maybeSingle(),
    supabase
      .from('task_assignees')
      .select('tasks(project_id)')
      .eq('user_id', profile.id),
  ]);

  const projectList =
    (projects as unknown as {
      id: string;
      name: string;
      color: string | null;
      clients: { id: string; name: string } | null;
    }[]) ?? [];

  const taskList =
    (tasks as {
      id: string;
      title: string;
      project_id: string;
      billable: boolean;
    }[]) ?? [];

  const assignedProjectIds = new Set(
    (
      (myAssignedTasks as unknown as {
        tasks: { project_id: string } | null;
      }[]) ?? []
    )
      .map((r) => r.tasks?.project_id)
      .filter((id): id is string => Boolean(id)),
  );
  const timerProjects = projectList.filter((p) => assignedProjectIds.has(p.id));
  const timerTasks = taskList.filter((t) =>
    assignedProjectIds.has(t.project_id),
  );

  return (
    <SidebarProvider>
      <AppSidebar
        user={{ name: profile.name, email: profile.email }}
        isAdmin={profile.role === 'admin'}
        projects={projectList}
      />
      <SidebarInset>
        <header className='flex h-12 shrink-0 items-center justify-between gap-2 border-b px-4'>
          <div className='flex items-center gap-2'>
            <SidebarTrigger />
            <Separator orientation='vertical' className='h-4' />
          </div>
          <TimerBar
            runningEntry={runningEntry as RunningTimeEntry | null}
            projects={timerProjects.map((p) => ({
              id: p.id,
              name: p.name,
              clientName: p.clients?.name ?? null,
            }))}
            tasks={timerTasks}
          />
        </header>
        <main className='flex-1 overflow-x-hidden overflow-y-auto pt-4 plr-0 pb-4 pl-0'>
          <div className='grid grid-cols-12 gap-6'>{children}</div>
        </main>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}
