import { createClient } from "@/lib/supabase/client";
import type { Settings } from "@/types";

export async function fetchSettings() {
  const supabase = createClient();
  const { data, error } = await supabase.from("settings").select("*").eq("id", 1).single();
  if (error) throw error;
  return data as Settings;
}

export async function updateSettings(settings: Partial<Settings>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("settings")
    .update({ ...settings, updated_at: new Date().toISOString() })
    .eq("id", 1)
    .select()
    .single();
  if (error) throw error;
  return data as Settings;
}
