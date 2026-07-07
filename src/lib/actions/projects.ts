"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProjectStatus } from "@/lib/supabase/types";

export async function createProject(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const client_id = String(formData.get("client_id"));
  const name = String(formData.get("name"));
  const status = String(formData.get("status")) as ProjectStatus;

  const { error } = await supabase.from("projects").insert({ client_id, name, status });

  if (error) throw new Error(error.message);

  revalidatePath("/");
}

export async function updateProjectStatus(projectId: string, status: ProjectStatus) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("projects").update({ status }).eq("id", projectId);

  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath(`/projects/${projectId}`);
}
