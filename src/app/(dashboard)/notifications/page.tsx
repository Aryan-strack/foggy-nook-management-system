"use client";

import * as React from "react";
import { Loader2Icon, BellIcon, AlertTriangleIcon, XCircleIcon, TargetIcon } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  fetchNotifications,
  markNotificationRead,
  generateLowStockNotifications,
} from "@/services/notifications";
import type { AppNotification } from "@/types";
import { useAppStore } from "@/store/app-store";
import { cn } from "@/lib/utils";

const TYPE_ICON: Record<string, React.ElementType> = {
  low_stock: AlertTriangleIcon,
  out_of_stock: XCircleIcon,
  expired: XCircleIcon,
  target: TargetIcon,
};

export default function NotificationsPage() {
  const profile = useAppStore((s) => s.profile);
  const activeBranchId = useAppStore((s) => s.activeBranchId);
  const branchId = profile?.role === "manager" ? profile.branch_id : activeBranchId;

  const [notifications, setNotifications] = React.useState<AppNotification[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const load = React.useCallback(() => {
    if (!profile) return;
    setLoading(true);
    fetchNotifications(branchId)
      .then(setNotifications)
      .catch((e) => toast.error("Failed to load notifications", { description: e.message }))
      .finally(() => setLoading(false));
  }, [profile, branchId]);

  React.useEffect(load, [load]);

  async function handleRefreshStockAlerts() {
    const target = branchId ?? profile?.branch_id;
    if (!target) {
      toast.error("Select a branch first");
      return;
    }
    setRefreshing(true);
    try {
      await generateLowStockNotifications(target);
      toast.success("Stock alerts refreshed");
      load();
    } catch (e) {
      toast.error("Could not refresh alerts", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setRefreshing(false);
    }
  }

  async function handleMarkRead(id: string) {
    await markNotificationRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Low stock, out-of-stock, expiry, and sales target alerts."
        action={
          <Button variant="outline" onClick={handleRefreshStockAlerts} disabled={refreshing}>
            {refreshing && <Loader2Icon className="animate-spin" />}
            Refresh Stock Alerts
          </Button>
        }
      />

      {loading ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          <Loader2Icon className="mr-2 size-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.length === 0 && (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
              <BellIcon className="size-6" />
              <p className="text-sm">No notifications yet.</p>
            </div>
          )}
          {notifications.map((n) => {
            const Icon = TYPE_ICON[n.type] ?? BellIcon;
            return (
              <button
                key={n.id}
                onClick={() => !n.is_read && handleMarkRead(n.id)}
                className={cn(
                  "flex items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
                  n.is_read ? "opacity-60" : "hover:bg-secondary/50"
                )}
              >
                <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
                  <Icon className="size-3.5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.message && <p className="text-xs text-muted-foreground">{n.message}</p>}
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {new Date(n.created_at).toLocaleString("en-PK", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                {!n.is_read && <Badge variant="gold">New</Badge>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
