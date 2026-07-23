import { createClient } from "@/lib/supabase/client";
import type { Sale, Expense, BranchInventory } from "@/types";

export async function fetchReportData(branchId: string | null, from: string, to: string) {
  const supabase = createClient();

  let salesQuery = supabase
    .from("sales")
    .select("*, branch:branches(*), cashier:profiles(*), items:sale_items(*, product:products(*, brand:brands(*), category:categories(*)))")
    .gte("created_at", from)
    .lte("created_at", to);
  if (branchId) salesQuery = salesQuery.eq("branch_id", branchId);

  let expensesQuery = supabase
    .from("expenses")
    .select("*, branch:branches(*), category:expense_categories(*)")
    .gte("expense_date", from.slice(0, 10))
    .lte("expense_date", to.slice(0, 10));
  if (branchId) expensesQuery = expensesQuery.eq("branch_id", branchId);

  let inventoryQuery = supabase
    .from("branch_inventory")
    .select("*, product:products(*, brand:brands(*), category:categories(*)), branch:branches(*)");
  if (branchId) inventoryQuery = inventoryQuery.eq("branch_id", branchId);

  const [salesRes, expensesRes, inventoryRes] = await Promise.all([
    salesQuery,
    expensesQuery,
    inventoryQuery,
  ]);

  return {
    sales: (salesRes.data ?? []) as unknown as Sale[],
    expenses: (expensesRes.data ?? []) as unknown as Expense[],
    inventory: (inventoryRes.data ?? []) as unknown as BranchInventory[],
  };
}

export function groupBy<T, K extends string>(
  items: T[],
  keyFn: (item: T) => K
): Record<K, T[]> {
  return items.reduce(
    (acc, item) => {
      const key = keyFn(item);
      (acc[key] ??= []).push(item);
      return acc;
    },
    {} as Record<K, T[]>
  );
}
