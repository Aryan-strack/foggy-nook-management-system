"use client";

import * as React from "react";
import { Loader2Icon, HistoryIcon } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { fetchActivityLogs } from "@/services/activity-logs";
import type { ActivityLog } from "@/types";
import { useAppStore } from "@/store/app-store";

export default function ActivityLogsPage() {
  const profile = useAppStore((s) => s.profile);
  const activeBranchId = useAppStore((s) => s.activeBranchId);
  const branchId = profile?.role === "manager" ? profile.branch_id : activeBranchId;

  const [logs, setLogs] = React.useState<ActivityLog[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!profile) return;
    setLoading(true);
    fetchActivityLogs(branchId)
      .then(setLogs)
      .catch((e) => toast.error("Failed to load activity logs", { description: e.message }))
      .finally(() => setLoading(false));
  }, [profile, branchId]);

  return (
    <div>
      <PageHeader title="Activity Logs" description="Every action, tracked across every branch." />

      {loading ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          <Loader2Icon className="mr-2 size-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="flex flex-col gap-1 rounded-lg border">
          {logs.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No activity recorded yet.
            </p>
          )}
          {logs.map((log, idx) => (
            <div
              key={log.id}
              className={`flex items-start gap-3 px-4 py-3 ${
                idx !== logs.length - 1 ? "border-b" : ""
              }`}
            >
              <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                <HistoryIcon className="size-3.5" />
              </div>
              <div className="flex-1">
                <p className="text-sm">
                  <span className="font-medium">{log.actor?.full_name ?? "System"}</span>{" "}
                  {log.action}
                </p>
                <p className="text-xs text-muted-foreground">
                  {log.branch?.name ?? "—"} &middot;{" "}
                  {new Date(log.created_at).toLocaleString("en-PK", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
