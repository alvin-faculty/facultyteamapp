"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";

export async function createSection(projectId: string, name: string) {
  const supabase = await createSupabaseServerClient();

  const { count } = await supabase
    .from("sections")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  const { error } = await supabase
    .from("sections")
    .insert({ project_id: projectId, name, position: count ?? 0 });

  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}`);
}
