import { createClient } from "@/lib/supabase/client";
import type { BranchPrinter } from "@/types";

export async function fetchBranchPrinters() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("branch_printers")
    .select("*, branch:branches(*)")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as unknown as BranchPrinter[];
}

export async function fetchBranchPrinter(branchId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("branch_printers")
    .select("*, branch:branches(*)")
    .eq("branch_id", branchId)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as BranchPrinter | null;
}

export async function upsertBranchPrinter(
  branchId: string,
  config: Partial<BranchPrinter>
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("branch_printers")
    .upsert(
      { branch_id: branchId, ...config, updated_at: new Date().toISOString() },
      { onConflict: "branch_id" }
    )
    .select()
    .single();
  if (error) throw error;
  return data as unknown as BranchPrinter;
}
