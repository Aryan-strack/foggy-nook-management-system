import { createClient } from "@/lib/supabase/client";
import type { AppNotification } from "@/types";

export async function fetchNotifications(branchId?: string | null) {
  const supabase = createClient();
  let query = supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (branchId) query = query.eq("branch_id", branchId);
  const { data, error } = await query;
  if (error) throw error;
  return data as AppNotification[];
}

export async function markNotificationRead(id: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id);
  if (error) throw error;
}

export async function generateLowStockNotifications(branchId: string) {
  const supabase = createClient();
  const { data: lowStock } = await supabase
    .from("branch_inventory")
    .select("*, product:products(*)")
    .eq("branch_id", branchId);

  const alerts = (lowStock ?? []).filter(
    (i) => i.product && i.stock <= i.product.minimum_stock
  );

  for (const item of alerts) {
    await supabase.from("notifications").insert({
      branch_id: branchId,
      type: item.stock <= 0 ? "out_of_stock" : "low_stock",
      title: item.stock <= 0 ? "Out of stock" : "Low stock",
      message: `${item.product.name} is ${item.stock <= 0 ? "out of stock" : `low (${item.stock} left)`}`,
      metadata: { product_id: item.product_id },
    });
  }
}
