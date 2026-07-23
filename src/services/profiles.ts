import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types";

export async function fetchCurrentProfile() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*, branch:branches(*)")
    .eq("id", user.id)
    .single();
  if (error) throw error;
  return data as unknown as Profile;
}

export async function fetchManagers() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*, branch:branches(*)")
    .eq("role", "manager")
    .order("full_name");
  if (error) throw error;
  return data as unknown as Profile[];
}
