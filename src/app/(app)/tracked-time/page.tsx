import { redirect } from 'next/navigation';
import { requireProfile } from '@/lib/current-user';
import { createClient } from '@/lib/supabase/server';
import {
  TrackedTimeReport,
  type TrackedEntry,
} from '@/components/TrackedTimeReport';

interface TimeEntryRow {
  id: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  billable: boolean;
  rate_snapshot: number;
  description: string | null;
  user_id: string;
  project_id: string | null;
  task_id: string | null;
  my_task_id: string | null;
  profiles: { name: string } | null;
  projects: {
    name: string;
    color: string | null;
    client_id: string;
    clients: { name: string } | null;
  } | null;
  tasks: { title: string } | null;
  my_tasks: { title: string | null } | null;
}

export default async function TrackedTimePage() {
  const profile = await requireProfile();
  if (profile.role !== 'admin') redirect('/');

  const supabase = await createClient();
  const [{ data: entries }, { data: teamProfiles }] = await Promise.all([
    supabase
      .from('time_entries')
      .select(
        'id, started_at, ended_at, duration_minutes, billable, rate_snapshot, description, user_id, project_id, task_id, my_task_id, profiles(name), projects(name, color, client_id, clients(name)), tasks(title), my_tasks(title)',
      )
      .not('ended_at', 'is', null)
      .order('started_at', { ascending: false }),
    supabase.from('profiles').select('id, name').order('name'),
  ]);

  const rows = (entries as unknown as TimeEntryRow[]) ?? [];

  const trackedEntries: TrackedEntry[] = rows.map((e) => ({
    id: e.id,
    started_at: e.started_at,
    ended_at: e.ended_at,
    duration_minutes: e.duration_minutes,
    billable: e.billable,
    rate_snapshot: e.rate_snapshot,
    description: e.description,
    user_id: e.user_id,
    user_name: e.profiles?.name ?? 'Someone',
    project_id: e.project_id,
    project_name: e.projects?.name ?? 'Personal',
    project_color: e.projects?.color ?? null,
    client_id: e.projects?.client_id ?? null,
    client_name: e.projects?.clients?.name ?? null,
    task_id: e.task_id,
    task_title: e.tasks?.title ?? e.my_tasks?.title ?? null,
    my_task_id: e.my_task_id,
    my_task_title: e.my_tasks?.title ?? null,
  }));

  const teamMembers = (teamProfiles as { id: string; name: string }[]) ?? [];

  return (
    <TrackedTimeReport entries={trackedEntries} teamMembers={teamMembers} />
  );
}
