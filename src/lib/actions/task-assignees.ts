"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";

export async function assignTaskMember(taskId: string, projectId: string, userId: string) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("task_assignees").insert({ task_id: taskId, user_id: userId });

  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}`);
}

export async function unassignTaskMember(taskId: string, projectId: string, userId: string) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("task_assignees")
    .delete()
    .eq("task_id", taskId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}`);
}
