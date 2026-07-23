"use client";

import * as React from "react";
import { Loader2Icon, ShieldAlertIcon } from "lucide-react";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { fetchDashboardMetrics, type DashboardMetrics } from "@/services/dashboard";
import { SalesTrendChart } from "@/components/dashboard/sales-trend-chart";
import { TopProductsChart, BranchComparisonChart } from "@/components/dashboard/product-charts";
import { fetchReportData, groupBy } from "@/services/reports";
import { useAppStore } from "@/store/app-store";
import { formatCurrency } from "@/lib/utils";

export default function AnalyticsPage() {
  const profile = useAppStore((s) => s.profile);
  const activeBranchId = useAppStore((s) => s.activeBranchId);
  const branchId = profile?.role === "manager" ? profile.branch_id : activeBranchId;

  const [metrics, setMetrics] = React.useState<DashboardMetrics | null>(null);
  const [managerData, setManagerData] = React.useState<{ name: string; sales: number }[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!profile || profile.role === "manager") return;
    setLoading(true);
    const since = new Date();
    since.setDate(since.getDate() - 30);

    Promise.all([
      fetchDashboardMetrics(branchId),
      fetchReportData(branchId, since.toISOString(), new Date().toISOString()),
    ])
      .then(([m, r]) => {
        setMetrics(m);
        const grouped = groupBy(r.sales, (s) => s.cashier?.full_name ?? "Unknown");
        setManagerData(
          Object.entries(grouped)
            .map(([name, rows]) => ({
              name,
              sales: rows.reduce((s, x) => s + Number(x.total), 0),
            }))
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 8)
        );
      })
      .catch((e) => toast.error("Failed to load analytics", { description: e.message }))
      .finally(() => setLoading(false));
  }, [profile, branchId]);

  if (profile?.role === "manager") {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
        <ShieldAlertIcon className="size-8" />
        <p>Analytics is available to Admins and the Super Admin.</p>
      </div>
    );
  }

  if (loading || !metrics) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        <Loader2Icon className="mr-2 size-4 animate-spin" /> Loading analytics…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Analytics" description="Performance across products, brands, managers, and branches." />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <SalesTrendChart data={metrics.dailySalesSeries} />
        </div>
        <TopProductsChart data={metrics.topProducts} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {!branchId && <BranchComparisonChart data={metrics.branchComparison} />}

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-foreground">
              Best Performing Managers (30d)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72 pb-5">
            {managerData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No sales yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={managerData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid horizontal={false} stroke="var(--color-border)" />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={110}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    stroke="var(--color-muted-foreground)"
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                  <Bar dataKey="sales" radius={[0, 6, 6, 0]} fill="var(--color-accent)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
