"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";

export async function createTask(projectId: string, sectionId: string, formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const title = String(formData.get("title"));
  const due_date = (formData.get("due_date") as string) || null;

  const { count } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("section_id", sectionId);

  const { error } = await supabase.from("tasks").insert({
    project_id: projectId,
    section_id: sectionId,
    title,
    due_date,
    position: count ?? 0,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}`);
}

export async function moveTask(
  projectId: string,
  taskId: string,
  sectionId: string,
  position: number,
) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("tasks")
    .update({ section_id: sectionId, position })
    .eq("id", taskId);

  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}`);
}

export async function toggleTaskCompleted(taskId: string, projectId: string, completed: boolean) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("tasks").update({ completed }).eq("id", taskId);

  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}`);
}

export async function createSubtask(projectId: string, parentTaskId: string, title: string) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("tasks").insert({
    project_id: projectId,
    parent_task_id: parentTaskId,
    section_id: null,
    title,
    position: 0,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}`);
}

export async function updateTaskDescription(taskId: string, projectId: string, description: string) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("tasks")
    .update({ description: description || null })
    .eq("id", taskId);

  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}`);
}

export async function updateTaskDueDate(taskId: string, projectId: string, dueDate: string) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("tasks")
    .update({ due_date: dueDate || null })
    .eq("id", taskId);

  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteTask(taskId: string, projectId: string) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("tasks").delete().eq("id", taskId);

  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}`);
}
