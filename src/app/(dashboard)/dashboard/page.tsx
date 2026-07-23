"use client";

import * as React from "react";
import {
  WalletIcon,
  TrendingUpIcon,
  ReceiptIcon,
  PackageIcon,
  TagIcon,
  ShapesIcon,
  BoxesIcon,
  AlertTriangleIcon,
  XCircleIcon,
  Loader2Icon,
} from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { fetchDashboardMetrics, type DashboardMetrics } from "@/services/dashboard";
import { StatCard } from "@/components/dashboard/stat-card";
import { SalesTrendChart } from "@/components/dashboard/sales-trend-chart";
import {
  TopProductsChart,
  BranchComparisonChart,
} from "@/components/dashboard/product-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

export default function DashboardPage() {
  const profile = useAppStore((s) => s.profile);
  const activeBranchId = useAppStore((s) => s.activeBranchId);
  const [metrics, setMetrics] = React.useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!profile) return;
    setLoading(true);
    fetchDashboardMetrics(activeBranchId)
      .then(setMetrics)
      .finally(() => setLoading(false));
  }, [profile, activeBranchId]);

  if (loading || !metrics) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2Icon className="mr-2 size-4 animate-spin" /> Loading dashboard…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-2xl font-semibold">
          Welcome back, {profile?.full_name?.split(" ")[0]}
        </h2>
        <p className="text-sm text-muted-foreground">
          {activeBranchId
            ? "Showing data for the selected branch."
            : "Showing combined data across all branches."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        <StatCard
          label="Today's Sales"
          value={formatCurrency(metrics.todaySales)}
          icon={TrendingUpIcon}
          tone="gold"
        />
        <StatCard
          label="Today's Profit"
          value={formatCurrency(metrics.todayProfit)}
          icon={WalletIcon}
          tone="success"
        />
        <StatCard
          label="Today's Expenses"
          value={formatCurrency(metrics.todayExpenses)}
          icon={ReceiptIcon}
          tone="warning"
        />
        <StatCard
          label="Weekly Sales"
          value={formatCurrency(metrics.weekSales)}
          icon={TrendingUpIcon}
        />
        <StatCard
          label="Weekly Profit"
          value={formatCurrency(metrics.weekProfit)}
          icon={WalletIcon}
        />
        <StatCard
          label="Monthly Sales"
          value={formatCurrency(metrics.monthSales)}
          icon={TrendingUpIcon}
        />
        <StatCard
          label="Monthly Profit"
          value={formatCurrency(metrics.monthProfit)}
          icon={WalletIcon}
        />
        <StatCard
          label="Monthly Expenses"
          value={formatCurrency(metrics.monthExpenses)}
          icon={ReceiptIcon}
        />
        <StatCard
          label="Total Products"
          value={String(metrics.totalProducts)}
          icon={PackageIcon}
        />
        <StatCard
          label="Total Brands"
          value={String(metrics.totalBrands)}
          icon={TagIcon}
        />
        <StatCard
          label="Total Categories"
          value={String(metrics.totalCategories)}
          icon={ShapesIcon}
        />
        <StatCard
          label="Inventory Value"
          value={formatCurrency(metrics.inventoryValue)}
          icon={BoxesIcon}
        />
        <StatCard
          label="Low Stock"
          value={String(metrics.lowStockCount)}
          icon={AlertTriangleIcon}
          tone="warning"
        />
        <StatCard
          label="Out of Stock"
          value={String(metrics.outOfStockCount)}
          icon={XCircleIcon}
          tone="destructive"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <SalesTrendChart data={metrics.dailySalesSeries} />
        </div>
        <TopProductsChart data={metrics.topProducts} />
      </div>

      {!activeBranchId && metrics.branchComparison.length > 0 && (
        <BranchComparisonChart data={metrics.branchComparison} />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-foreground">
              Recent Sales
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pb-5">
            {metrics.recentSales.length === 0 && (
              <p className="text-sm text-muted-foreground">No sales yet.</p>
            )}
            {metrics.recentSales.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <div className="flex flex-col">
                  <span className="font-medium">{s.invoice_no}</span>
                  <span className="text-xs text-muted-foreground">
                    {s.branch?.name} &middot;{" "}
                    {new Date(s.created_at).toLocaleString("en-PK", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
                <Badge variant="gold">{formatCurrency(s.total)}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-foreground">
              Recent Expenses
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pb-5">
            {metrics.recentExpenses.length === 0 && (
              <p className="text-sm text-muted-foreground">No expenses recorded.</p>
            )}
            {metrics.recentExpenses.map((e) => (
              <div key={e.id} className="flex items-center justify-between text-sm">
                <div className="flex flex-col">
                  <span className="font-medium">{e.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {e.category?.name} &middot; {e.expense_date}
                  </span>
                </div>
                <Badge variant="secondary">{formatCurrency(e.amount)}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
