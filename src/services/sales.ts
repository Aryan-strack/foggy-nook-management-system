import { createClient } from "@/lib/supabase/client";
import type { CartItem, PaymentMethod, Sale } from "@/types";

export async function checkoutSale(params: {
  branchId: string;
  cashierId: string;
  customerId?: string | null;
  customerName?: string | null;
  items: CartItem[];
  discount: number;
  tax: number;
  paymentMethod: PaymentMethod;
  paymentBreakdown?: Record<string, number> | null;
  paidAmount?: number | null;
  notes?: string;
}) {
  const supabase = createClient();

  const items = params.items.map((i) => ({
    product_id: i.product.id,
    item_type: i.itemType,
    quantity: i.quantity,
    unit_price: i.unitPrice,
    unit_cost: i.unitCost,
    discount: i.discount,
  }));

  const { data, error } = await supabase.rpc("checkout_sale", {
    p_branch_id: params.branchId,
    p_cashier_id: params.cashierId,
    p_customer_id: params.customerId ?? null,
    p_items: items,
    p_discount: params.discount,
    p_tax: params.tax,
    p_payment_method: params.paymentMethod,
    p_payment_breakdown: params.paymentBreakdown ?? null,
    p_notes: params.notes ?? null,
    p_customer_name: params.customerName ?? null,
    p_paid_amount: params.paidAmount ?? null,
  });

  if (error) throw error;
  return data as Sale;
}

export async function fetchSales(branchId?: string | null, limit = 50) {
  const supabase = createClient();
  let query = supabase
    .from("sales")
    .select("*, branch:branches(*), cashier:profiles(*)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (branchId) query = query.eq("branch_id", branchId);
  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as Sale[];
}

export async function fetchSaleWithItems(saleId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sales")
    .select("*, branch:branches(*), cashier:profiles(*), items:sale_items(*, product:products(*))")
    .eq("id", saleId)
    .single();
  if (error) throw error;
  return data as unknown as Sale;
}
