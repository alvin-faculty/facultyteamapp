"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markInvoiced(
  clientId: string,
  projectId: string | null,
  startDate: string,
  endDate: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  let projectIds: string[];
  if (projectId) {
    projectIds = [projectId];
  } else {
    const { data: clientProjects } = await supabase.from("projects").select("id").eq("client_id", clientId);
    projectIds = (clientProjects ?? []).map((p) => p.id);
  }

  const { data: batch, error: batchError } = await supabase
    .from("invoice_batches")
    .insert({
      client_id: clientId,
      date_range_start: startDate,
      date_range_end: endDate,
      exported_by: user.id,
    })
    .select("id")
    .single();

  if (batchError) throw new Error(batchError.message);

  const { error } = await supabase
    .from("time_entries")
    .update({ locked: true, invoice_batch_id: batch.id })
    .in("project_id", projectIds)
    .eq("billable", true)
    .eq("locked", false)
    .not("ended_at", "is", null)
    .gte("started_at", `${startDate}T00:00:00`)
    .lte("started_at", `${endDate}T23:59:59`);

  if (error) throw new Error(error.message);

  revalidatePath("/billing");
}
