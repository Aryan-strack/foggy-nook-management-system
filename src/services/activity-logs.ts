import { createClient } from "@/lib/supabase/client";
import type { ActivityLog } from "@/types";

export async function fetchActivityLogs(branchId?: string | null, limit = 100) {
  const supabase = createClient();
  let query = supabase
    .from("activity_logs")
    .select("*, actor:profiles(*), branch:branches(*)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (branchId) query = query.eq("branch_id", branchId);
  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as ActivityLog[];
}
