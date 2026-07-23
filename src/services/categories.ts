import { createClient } from "@/lib/supabase/client";
import type { Category } from "@/types";

export async function fetchCategories() {
  const supabase = createClient();
  const { data, error } = await supabase.from("categories").select("*").order("name");
  if (error) throw error;
  return data as Category[];
}

export async function createCategory(category: Partial<Category>) {
  const supabase = createClient();
  const { data, error } = await supabase.from("categories").insert(category).select().single();
  if (error) throw error;
  return data;
}

export async function updateCategory(id: string, category: Partial<Category>) {
  const supabase = createClient();
  const { data, error } = await supabase.from("categories").update(category).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteCategory(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}
