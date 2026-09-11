import { createClient } from '@/lib/supabase/server';
import { requireProfile } from '@/lib/current-user';
import { MyTasksBoard } from '@/components/MyTasksBoard';
import type { MyTaskWithDetails, Profile } from '@/lib/supabase/types';
import type { RunningTimeEntry } from '@/lib/actions/time-entries';

export default async function MyTasksPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string }>;
}) {
  const profile = await requireProfile();
  const { user: viewedUserIdParam } = await searchParams;
  const viewedUserId = viewedUserIdParam || profile.id;
  const isOwner = viewedUserId === profile.id;

  const supabase = await createClient();

  const [{ data: myTasks }, { data: runningEntry }, { data: teamProfiles }] =
    await Promise.all([
      supabase
        .from('my_tasks')
        .select(
          '*, tasks(title, project_id, high_priority, projects(name, clients(name)))',
        )
        .eq('user_id', viewedUserId)
        .order('position'),
      isOwner
        ? supabase
            .from('time_entries')
            .select('*, projects(name), tasks(title), my_tasks(title)')
            .eq('user_id', profile.id)
            .is('ended_at', null)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from('profiles').select('id, name').order('name'),
    ]);

  return (
    <div className='col-span-12 space-y-6'>
      <div className='flex flex-col justify-between mt-8 mb-12 gap-12 pl-5 pr-5'>
        <h1>My Tasks</h1>
      </div>
      <MyTasksBoard
        items={(myTasks as MyTaskWithDetails[]) ?? []}
        runningEntry={runningEntry as RunningTimeEntry | null}
        viewedUserId={viewedUserId}
        isOwner={isOwner}
        currentUserId={profile.id}
        teamMembers={(teamProfiles as Pick<Profile, 'id' | 'name'>[]) ?? []}
      />
    </div>
  );
}
