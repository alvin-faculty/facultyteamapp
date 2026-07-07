"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";

export async function addTaskComment(projectId: string, taskId: string, formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const body = String(formData.get("body"));
  if (!body.trim()) return;

  const { error } = await supabase
    .from("task_comments")
    .insert({ task_id: taskId, user_id: user.id, body });

  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}`);
}
