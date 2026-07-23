import { createClient } from "@/lib/supabase/client";
import type { Brand } from "@/types";

export async function fetchBrands() {
  const supabase = createClient();
  const { data, error } = await supabase.from("brands").select("*").order("name");
  if (error) throw error;
  return data as Brand[];
}

export async function createBrand(brand: Partial<Brand>) {
  const supabase = createClient();
  const { data, error } = await supabase.from("brands").insert(brand).select().single();
  if (error) throw error;
  return data;
}

export async function updateBrand(id: string, brand: Partial<Brand>) {
  const supabase = createClient();
  const { data, error } = await supabase.from("brands").update(brand).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteBrand(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("brands").delete().eq("id", id);
  if (error) throw error;
}
