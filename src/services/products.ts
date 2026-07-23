import { createClient } from "@/lib/supabase/client";
import type { Product } from "@/types";

export async function fetchProducts() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, brand:brands(*), category:categories(*)")
    .order("name");
  if (error) throw error;
  return data as unknown as Product[];
}

export async function createProduct(product: Partial<Product>) {
  const supabase = createClient();
  const { data, error } = await supabase.from("products").insert(product).select().single();
  if (error) throw error;
  return data;
}

export async function updateProduct(id: string, product: Partial<Product>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .update(product)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProduct(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}
