"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";

export async function createClientRecord(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const name = String(formData.get("name"));
  const contact_name = (formData.get("contact_name") as string) || null;
  const contact_email = (formData.get("contact_email") as string) || null;
  const notes = (formData.get("notes") as string) || null;

  const { data, error } = await supabase
    .from("clients")
    .insert({ name, contact_name, contact_email, notes })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/clients");
  redirect(`/clients/${data.id}`);
}

export async function updateClientRecord(clientId: string, formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const name = String(formData.get("name"));
  const contact_name = (formData.get("contact_name") as string) || null;
  const contact_email = (formData.get("contact_email") as string) || null;
  const notes = (formData.get("notes") as string) || null;

  const { error } = await supabase
    .from("clients")
    .update({ name, contact_name, contact_email, notes })
    .eq("id", clientId);

  if (error) throw new Error(error.message);

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
}
