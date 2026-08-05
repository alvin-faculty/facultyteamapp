import { createClient } from '@/lib/supabase/server';
import { requireProfile } from '@/lib/current-user';
import { MyTasksBoard } from '@/components/MyTasksBoard';
import type { MyTaskWithDetails } from '@/lib/supabase/types';
import type { RunningTimeEntry } from '@/lib/actions/time-entries';

export default async function MyTasksPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: myTasks }, { data: runningEntry }] = await Promise.all([
    supabase
      .from('my_tasks')
      .select('*, tasks(title, project_id, projects(name))')
      .eq('user_id', profile.id)
      .order('position'),
    supabase
      .from('time_entries')
      .select('*, projects(name), tasks(title)')
      .eq('user_id', profile.id)
      .is('ended_at', null)
      .maybeSingle(),
  ]);

  return (
    <div className='col-span-12 space-y-6'>
      <div className='flex flex-col justify-between mt-8 mb-12 gap-12 pl-5 pr-5'>
        <h1>My Tasks</h1>
      </div>
      <MyTasksBoard
        items={(myTasks as MyTaskWithDetails[]) ?? []}
        runningEntry={runningEntry as RunningTimeEntry | null}
      />
    </div>
  );
}
