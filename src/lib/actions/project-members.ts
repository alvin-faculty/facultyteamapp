"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";

export async function assignMember(projectId: string, userId: string) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("project_members")
    .insert({ project_id: projectId, user_id: userId });

  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath(`/projects/${projectId}`);
}

export async function unassignMember(projectId: string, userId: string) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath(`/projects/${projectId}`);
}
