'use server';

import { revalidatePath } from 'next/cache';
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';
import { requireProfile } from '@/lib/current-user';
import type { MyTaskCategory, MyTaskStatus } from '@/lib/supabase/types';

export async function createMyTask(
  category: MyTaskCategory,
  title: string,
  status: MyTaskStatus,
  notes?: string,
) {
  const profile = await requireProfile();
  const supabase = await createSupabaseServerClient();

  const { data: last } = await supabase
    .from('my_tasks')
    .select('position')
    .eq('user_id', profile.id)
    .eq('category', category)
    .eq('status', status)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();

  const position = (last?.position ?? -1) + 1;

  const { error } = await supabase
    .from('my_tasks')
    .insert({
      user_id: profile.id,
      category,
      title,
      status,
      position,
      notes: notes || null,
    });

  if (error) throw new Error(error.message);
  revalidatePath('/my-tasks');
}

export async function updateMyTask(
  myTaskId: string,
  title: string,
  notes: string,
) {
  await requireProfile();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from('my_tasks')
    .update({ title, notes: notes || null })
    .eq('id', myTaskId);

  if (error) throw new Error(error.message);
  revalidatePath('/my-tasks');
}

export async function updateMyTaskStatus(
  myTaskId: string,
  status: MyTaskStatus,
  position: number,
) {
  await requireProfile();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from('my_tasks')
    .update({ status, position })
    .eq('id', myTaskId);

  if (error) throw new Error(error.message);
  revalidatePath('/my-tasks');
}

export async function deleteMyTask(myTaskId: string) {
  await requireProfile();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from('my_tasks').delete().eq('id', myTaskId);

  if (error) throw new Error(error.message);
  revalidatePath('/my-tasks');
}
