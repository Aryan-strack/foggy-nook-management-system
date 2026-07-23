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
    skip_inventory: i.isManual || false,
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

export async function createManualSale(params: {
  branchId: string;
  cashierId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  discount: number;
  customerName?: string | null;
  paymentMethod: PaymentMethod;
  paidAmount?: number | null;
  notes?: string;
}) {
  const supabase = createClient();

  let { data: manualProduct } = await supabase
    .from("products")
    .select("id")
    .eq("sku", "MANUAL-ITEM")
    .maybeSingle();

  if (!manualProduct) {
    const { data: created, error: createError } = await supabase
      .from("products")
      .insert({
        name: "Manual Sale Item",
        sku: "MANUAL-ITEM",
        cost_price: 0,
        selling_price: 0,
        is_active: false,
        is_loose_saleable: true,
      })
      .select("id")
      .single();

    if (createError || !created) {
      throw createError ?? new Error("Failed to create manual sale placeholder product");
    }
    manualProduct = created;
  }

  const productId = manualProduct.id;

  const items = [
    {
      product_id: productId,
      item_type: "unit",
      quantity: params.quantity,
      unit_price: params.unitPrice,
      unit_cost: params.unitCost,
      discount: params.discount,
      skip_inventory: true,
      custom_item_name: params.productName,
    },
  ];

  const { data, error } = await supabase.rpc("checkout_sale", {
    p_branch_id: params.branchId,
    p_cashier_id: params.cashierId,
    p_customer_id: null,
    p_items: items,
    p_discount: 0,
    p_tax: 0,
    p_payment_method: params.paymentMethod,
    p_payment_breakdown: null,
    p_notes: params.notes ?? null,
    p_customer_name: params.customerName ?? null,
    p_paid_amount: params.paidAmount ?? null,
    p_skip_inventory: true,
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
