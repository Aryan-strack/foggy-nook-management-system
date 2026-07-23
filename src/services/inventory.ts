import { createClient } from "@/lib/supabase/client";
import type { BranchInventory, InventoryMovementType } from "@/types";

export async function fetchBranchInventory(branchId?: string | null) {
  const supabase = createClient();
  let query = supabase
    .from("branch_inventory")
    .select("*, product:products(*, brand:brands(*), category:categories(*)), branch:branches(*)");
  if (branchId) query = query.eq("branch_id", branchId);
  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as BranchInventory[];
}

export async function fetchBranchPosProducts(branchId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_branch_pos_products", {
    p_branch_id: branchId,
  });
  if (error) throw error;
  const raw = (data ?? []) as unknown as Record<string, unknown>[];
  return raw.map((row, idx) => ({
    ...row,
    id: (row.id as string) ?? `pos-${idx}`,
    product: row.product as BranchInventory["product"],
    branch: row.branch as BranchInventory["branch"],
  })) as unknown as BranchInventory[];
}

export async function adjustStock(params: {
  branchId: string;
  productId: string;
  movementType: InventoryMovementType;
  quantity: number; // positive delta to apply
  reason?: string;
  performedBy: string;
  transferToBranchId?: string;
}) {
  const supabase = createClient();

  const { data: existing } = await supabase
    .from("branch_inventory")
    .select("*")
    .eq("branch_id", params.branchId)
    .eq("product_id", params.productId)
    .maybeSingle();

  const stockBefore = existing?.stock ?? 0;
  const stockAfter = stockBefore + params.quantity;

  if (existing) {
    await supabase
      .from("branch_inventory")
      .update({ stock: stockAfter, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await supabase.from("branch_inventory").insert({
      branch_id: params.branchId,
      product_id: params.productId,
      stock: stockAfter,
    });
  }

  const { error } = await supabase.from("inventory_logs").insert({
    branch_id: params.branchId,
    product_id: params.productId,
    movement_type: params.movementType,
    quantity: params.quantity,
    stock_before: stockBefore,
    stock_after: stockAfter,
    reason: params.reason,
    performed_by: params.performedBy,
    transfer_to_branch_id: params.transferToBranchId,
  });
  if (error) throw error;

  return stockAfter;
}
