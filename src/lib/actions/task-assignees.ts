'use server';

import { revalidatePath } from 'next/cache';
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';

export async function assignTaskMember(
  taskId: string,
  projectId: string,
  userId: string,
) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from('task_assignees')
    .insert({ task_id: taskId, user_id: userId });
  if (error) throw new Error(error.message);

  const { error: myTaskError } = await supabase
    .from('my_tasks')
    .insert({
      user_id: userId,
      category: 'studio',
      project_task_id: taskId,
      status: 'not_started',
      position: 0,
    });

  // 23505 = unique violation — a Studio card for this user+task already exists,
  // which is fine, nothing to do. Any other error is a real problem.
  if (myTaskError && myTaskError.code !== '23505') {
    throw new Error(myTaskError.message);
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/my-tasks');
}

export async function unassignTaskMember(
  taskId: string,
  projectId: string,
  userId: string,
) {
  const supabase = await createSupabaseServerClient();

  const { error: myTaskError } = await supabase
    .from('my_tasks')
    .delete()
    .eq('user_id', userId)
    .eq('project_task_id', taskId)
    .eq('category', 'studio');
  if (myTaskError) throw new Error(myTaskError.message);

  const { error } = await supabase
    .from('task_assignees')
    .delete()
    .eq('task_id', taskId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/my-tasks');
}
