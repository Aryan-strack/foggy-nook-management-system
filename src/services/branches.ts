import { createClient } from "@/lib/supabase/client";
import type { Branch } from "@/types";

export async function fetchBranches() {
  const supabase = createClient();
  const { data, error } = await supabase.from("branches").select("*").order("name");
  if (error) throw error;
  return data as Branch[];
}

export async function createBranch(branch: Partial<Branch>) {
  const supabase = createClient();
  const { data, error } = await supabase.from("branches").insert(branch).select().single();
  if (error) throw error;
  return data;
}

export async function updateBranch(id: string, branch: Partial<Branch>) {
  const supabase = createClient();
  const { data, error } = await supabase.from("branches").update(branch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}
