import { createClient } from "@/lib/supabase/client";
import type { Expense, ExpenseCategory } from "@/types";

export async function fetchExpenses(branchId?: string | null) {
  const supabase = createClient();
  let query = supabase
    .from("expenses")
    .select("*, branch:branches(*), category:expense_categories(*)")
    .order("expense_date", { ascending: false });
  if (branchId) query = query.eq("branch_id", branchId);
  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as Expense[];
}

export async function fetchExpenseCategories() {
  const supabase = createClient();
  const { data, error } = await supabase.from("expense_categories").select("*").order("name");
  if (error) throw error;
  return data as ExpenseCategory[];
}

export async function createExpense(expense: Partial<Expense>) {
  const supabase = createClient();
  const { data, error } = await supabase.from("expenses").insert(expense).select().single();
  if (error) throw error;
  return data;
}
