import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { TeamSettings } from "@/components/TeamSettings";
import type { Profile } from "@/lib/supabase/types";

export default async function SettingsPage() {
  const profile = await requireProfile();
  if (profile.role !== "admin") redirect("/");

  const supabase = await createClient();
  const { data: profiles } = await supabase.from("profiles").select("*").order("name");

  return <TeamSettings profiles={(profiles as Profile[]) ?? []} currentUserId={profile.id} />;
}
