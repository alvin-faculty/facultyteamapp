import { createClient } from '@/lib/supabase/server';
import { TimelineView } from '@/components/TimelineView';
import type { Client, Project, Task } from '@/lib/supabase/types';

type ProjectWithClient = Project & { clients: Client | null };

export default async function TimelinePage() {
  const supabase = await createClient();

  const [{ data: projects }, { data: tasks }] = await Promise.all([
    supabase
      .from('projects')
      .select('*, clients(*)')
      .order('start_date', { ascending: true, nullsFirst: false }),
    supabase.from('tasks').select('*').order('position'),
  ]);

  return (
    <div className='col-span-12 space-y-6'>
      <h1 className='text-2xl font-semibold'>Timeline</h1>
      <TimelineView
        projects={(projects as ProjectWithClient[]) ?? []}
        tasks={(tasks as Task[]) ?? []}
      />
    </div>
  );
}
