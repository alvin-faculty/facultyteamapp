'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireProfile } from '@/lib/current-user';

export async function createProjectComment(projectId: string, body: string) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase.from('project_comments').insert({
    project_id: projectId,
    user_id: profile.id,
    body,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/projects/${projectId}`);
}

export async function updateProjectComment(
  commentId: string,
  projectId: string,
  body: string,
) {
  await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase
    .from('project_comments')
    .update({ body, updated_at: new Date().toISOString() })
    .eq('id', commentId);
  if (error) throw new Error(error.message);

  revalidatePath(`/projects/${projectId}`);
}

export async function deleteProjectComment(
  commentId: string,
  projectId: string,
) {
  await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase
    .from('project_comments')
    .delete()
    .eq('id', commentId);
  if (error) throw new Error(error.message);

  revalidatePath(`/projects/${projectId}`);
}
