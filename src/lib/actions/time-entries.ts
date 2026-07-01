"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { minutesBetween } from "@/lib/format";

async function resolveRate(projectId: string, userId: string) {
  const supabase = await createClient();
  const [{ data: project }, { data: profile }] = await Promise.all([
    supabase.from("projects").select("hourly_rate_override").eq("id", projectId).single(),
    supabase.from("profiles").select("hourly_rate").eq("id", userId).single(),
  ]);
  return project?.hourly_rate_override ?? profile?.hourly_rate ?? 0;
}

export async function startTimer(projectId: string, taskId: string | null, description: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const rate_snapshot = await resolveRate(projectId, user.id);

  const { error } = await supabase.from("time_entries").insert({
    project_id: projectId,
    task_id: taskId,
    user_id: user.id,
    description: description || null,
    started_at: new Date().toISOString(),
    ended_at: null,
    billable: true,
    rate_snapshot,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/time");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
}

export async function stopTimer(entryId: string) {
  const supabase = await createClient();
  const { data: entry } = await supabase
    .from("time_entries")
    .select("*")
    .eq("id", entryId)
    .single();
  if (!entry) throw new Error("Entry not found");

  const ended_at = new Date().toISOString();
  const duration_minutes = minutesBetween(entry.started_at, ended_at);

  const { error } = await supabase
    .from("time_entries")
    .update({ ended_at, duration_minutes })
    .eq("id", entryId);

  if (error) throw new Error(error.message);
  revalidatePath("/time");
  revalidatePath(`/projects/${entry.project_id}`);
  revalidatePath("/");
}

export async function createManualEntry(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const project_id = String(formData.get("project_id"));
  const task_id = (formData.get("task_id") as string) || null;
  const description = (formData.get("description") as string) || null;
  const date = String(formData.get("date"));
  const hours = Number(formData.get("hours"));
  const billable = formData.get("billable") === "on";

  const rate_snapshot = await resolveRate(project_id, user.id);
  const duration_minutes = Math.round(hours * 60);
  const started_at = new Date(`${date}T09:00:00`).toISOString();
  const ended_at = new Date(new Date(started_at).getTime() + duration_minutes * 60000).toISOString();

  const { error } = await supabase.from("time_entries").insert({
    project_id,
    task_id,
    user_id: user.id,
    description,
    started_at,
    ended_at,
    duration_minutes,
    billable,
    rate_snapshot,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/time");
  revalidatePath(`/projects/${project_id}`);
  revalidatePath("/");
}

export async function deleteTimeEntry(entryId: string, projectId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("time_entries")
    .delete()
    .eq("id", entryId)
    .eq("locked", false);
  if (error) throw new Error(error.message);
  revalidatePath("/time");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
}

export async function toggleBillable(entryId: string, billable: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("time_entries")
    .update({ billable })
    .eq("id", entryId)
    .eq("locked", false);
  if (error) throw new Error(error.message);
  revalidatePath("/time");
  revalidatePath("/");
}
