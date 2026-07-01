"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TaskStatus } from "@/lib/supabase/types";

export async function createTask(projectId: string, formData: FormData) {
  const supabase = await createClient();

  const title = String(formData.get("title"));
  const description = (formData.get("description") as string) || null;
  const assignee_id = (formData.get("assignee_id") as string) || null;
  const due_date = (formData.get("due_date") as string) || null;

  const { count } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("status", "todo");

  const { error } = await supabase.from("tasks").insert({
    project_id: projectId,
    title,
    description,
    assignee_id,
    due_date,
    status: "todo",
    position: count ?? 0,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}`);
}

export async function moveTask(
  projectId: string,
  taskId: string,
  status: TaskStatus,
  position: number,
) {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").update({ status, position }).eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}`);
}

export async function addTaskComment(projectId: string, taskId: string, formData: FormData) {
  const supabase = await createClient();
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
