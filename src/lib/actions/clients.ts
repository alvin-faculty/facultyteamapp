"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";

export async function createClientRecord(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const name = String(formData.get("name"));
  const contact_name = (formData.get("contact_name") as string) || null;
  const contact_email = (formData.get("contact_email") as string) || null;

  const { data, error } = await supabase
    .from("clients")
    .insert({ name, contact_name, contact_email })
    .select("id, name")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/");
  return data;
}
