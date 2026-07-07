"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/current-user";
import type { UserRole } from "@/lib/supabase/types";

async function requireAdmin() {
  const profile = await requireProfile();
  if (profile.role !== "admin") throw new Error("Not authorized");
  return profile;
}

export async function inviteTeamMember(email: string) {
  await requireAdmin();

  const { error } = await createServiceRoleClient().auth.admin.inviteUserByEmail(email);
  if (error) throw new Error(error.message);

  revalidatePath("/settings");
}

export async function setTeamMemberRole(userId: string, role: UserRole) {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) throw new Error(error.message);

  revalidatePath("/settings");
}

export async function setTeamMemberDisabled(userId: string, disabled: boolean) {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ disabled }).eq("id", userId);
  if (error) throw new Error(error.message);

  const { error: banError } = await createServiceRoleClient().auth.admin.updateUserById(userId, {
    ban_duration: disabled ? "876000h" : "none",
  });
  if (banError) throw new Error(banError.message);

  revalidatePath("/settings");
}

export async function updateTeamMemberProfile(userId: string, name: string, hourlyRate: number) {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ name, hourly_rate: hourlyRate })
    .eq("id", userId);
  if (error) throw new Error(error.message);

  revalidatePath("/settings");
  revalidatePath("/", "layout");
}
