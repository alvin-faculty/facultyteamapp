"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import type { AssetLink, ProjectStatus } from "@/lib/supabase/types";

export async function createProject(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const client_id = String(formData.get("client_id"));
  const name = String(formData.get("name"));
  const status = String(formData.get("status")) as ProjectStatus;
  const budget_hours = formData.get("budget_hours") ? Number(formData.get("budget_hours")) : null;
  const budget_amount = formData.get("budget_amount") ? Number(formData.get("budget_amount")) : null;
  const hourly_rate_override = formData.get("hourly_rate_override")
    ? Number(formData.get("hourly_rate_override"))
    : null;
  const start_date = (formData.get("start_date") as string) || null;
  const end_date = (formData.get("end_date") as string) || null;

  const { data, error } = await supabase
    .from("projects")
    .insert({
      client_id,
      name,
      status,
      budget_hours,
      budget_amount,
      hourly_rate_override,
      start_date,
      end_date,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/projects");
  redirect(`/projects/${data.id}`);
}

export async function updateProjectStatus(projectId: string, status: ProjectStatus) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("projects").update({ status }).eq("id", projectId);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
}

export async function updateProjectDetails(projectId: string, formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const name = String(formData.get("name"));
  const status = String(formData.get("status")) as ProjectStatus;
  const budget_hours = formData.get("budget_hours") ? Number(formData.get("budget_hours")) : null;
  const budget_amount = formData.get("budget_amount") ? Number(formData.get("budget_amount")) : null;
  const hourly_rate_override = formData.get("hourly_rate_override")
    ? Number(formData.get("hourly_rate_override"))
    : null;
  const start_date = (formData.get("start_date") as string) || null;
  const end_date = (formData.get("end_date") as string) || null;

  const { error } = await supabase
    .from("projects")
    .update({
      name,
      status,
      budget_hours,
      budget_amount,
      hourly_rate_override,
      start_date,
      end_date,
    })
    .eq("id", projectId);

  if (error) throw new Error(error.message);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
}

export async function addAssetLink(projectId: string, link: AssetLink, existing: AssetLink[]) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("projects")
    .update({ asset_links: [...existing, link] })
    .eq("id", projectId);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}`);
}

export async function removeAssetLink(projectId: string, index: number, existing: AssetLink[]) {
  const supabase = await createSupabaseServerClient();
  const next = existing.filter((_, i) => i !== index);
  const { error } = await supabase.from("projects").update({ asset_links: next }).eq("id", projectId);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}`);
}
