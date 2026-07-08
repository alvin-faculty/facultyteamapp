"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/actions/team";
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

export async function updateProject(projectId: string, formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const name = String(formData.get("name"));
  const client_id = String(formData.get("client_id"));
  const status = String(formData.get("status")) as ProjectStatus;
  const start_date = (formData.get("start_date") as string) || null;
  const end_date = (formData.get("end_date") as string) || null;
  const colorRaw = formData.get("color") as string;
  const color = colorRaw && colorRaw !== "default" ? colorRaw : null;

  const { error } = await supabase
    .from("projects")
    .update({ name, client_id, status, start_date, end_date, color })
    .eq("id", projectId);

  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteProject(projectId: string) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("projects").delete().eq("id", projectId);

  if (error) throw new Error(error.message);

  revalidatePath("/");
}

export async function updateProjectBudgetHours(projectId: string, hours: number | null) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("projects").update({ budget_hours: hours }).eq("id", projectId);

  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath(`/projects/${projectId}`);
}

export async function updateProjectNumber(projectId: string, projectNumber: string) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("projects")
    .update({ project_number: projectNumber || null })
    .eq("id", projectId);

  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}`);
}

export async function updateProjectDropboxUrl(projectId: string, url: string) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("projects")
    .update({ dropbox_folder_url: url || null })
    .eq("id", projectId);

  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}`);
}

export async function uploadProposalScope(projectId: string, formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const file = formData.get("file") as File;
  if (!file || file.size === 0) throw new Error("No file selected");

  const path = `${projectId}/${crypto.randomUUID()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from("proposal-scopes").upload(path, file);
  if (uploadError) throw new Error(uploadError.message);

  const {
    data: { publicUrl },
  } = supabase.storage.from("proposal-scopes").getPublicUrl(path);

  const { error } = await supabase
    .from("projects")
    .update({ proposal_scope_url: publicUrl })
    .eq("id", projectId);

  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}`);
}
