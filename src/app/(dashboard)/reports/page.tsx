"use client";

import * as React from "react";
import { Loader2Icon, DownloadIcon } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { fetchReportData, groupBy } from "@/services/reports";
import type { Sale, Expense, BranchInventory } from "@/types";
import { useAppStore } from "@/store/app-store";
import { formatCurrency } from "@/lib/utils";

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function ReportsPage() {
  const profile = useAppStore((s) => s.profile);
  const activeBranchId = useAppStore((s) => s.activeBranchId);
  const branchId = profile?.role === "manager" ? profile.branch_id : activeBranchId;

  const [from, setFrom] = React.useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toDateInput(d);
  });
  const [to, setTo] = React.useState(() => toDateInput(new Date()));

  const [sales, setSales] = React.useState<Sale[]>([]);
  const [expenses, setExpenses] = React.useState<Expense[]>([]);
  const [inventory, setInventory] = React.useState<BranchInventory[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(() => {
    if (!profile) return;
    setLoading(true);
    fetchReportData(branchId, `${from}T00:00:00`, `${to}T23:59:59`)
      .then((d) => {
        setSales(d.sales);
        setExpenses(d.expenses);
        setInventory(d.inventory);
      })
      .catch((e) => toast.error("Failed to load report", { description: e.message }))
      .finally(() => setLoading(false));
  }, [profile, branchId, from, to]);

  React.useEffect(load, [load]);

  const totalSales = sales.reduce((s, x) => s + Number(x.total), 0);
  const totalProfit = sales.reduce((s, x) => s + Number(x.profit), 0);
  const totalExpenses = expenses.reduce((s, x) => s + Number(x.amount), 0);

  const byBranch = Object.entries(groupBy(sales, (s) => s.branch?.name ?? "Unknown")).map(
    ([name, rows]) => ({
      name,
      sales: rows.reduce((s, x) => s + Number(x.total), 0),
      profit: rows.reduce((s, x) => s + Number(x.profit), 0),
      count: rows.length,
    })
  );

  const byManager = Object.entries(
    groupBy(sales, (s) => s.cashier?.full_name ?? "Unknown")
  ).map(([name, rows]) => ({
    name,
    sales: rows.reduce((s, x) => s + Number(x.total), 0),
    count: rows.length,
  }));

  const allItems = sales.flatMap((s) => s.items ?? []);
  const byProduct = Object.entries(
    groupBy(allItems, (i) => i.product?.name ?? "Unknown")
  )
    .map(([name, rows]) => ({
      name,
      qty: rows.reduce((s, x) => s + Number(x.quantity), 0),
      revenue: rows.reduce((s, x) => s + Number(x.total), 0),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const byBrand = Object.entries(
    groupBy(allItems, (i) => i.product?.brand?.name ?? "Unknown")
  ).map(([name, rows]) => ({
    name,
    revenue: rows.reduce((s, x) => s + Number(x.total), 0),
  }));

  const byCategory = Object.entries(
    groupBy(allItems, (i) => i.product?.category?.name ?? "Unknown")
  ).map(([name, rows]) => ({
    name,
    revenue: rows.reduce((s, x) => s + Number(x.total), 0),
  }));

  const byExpenseCategory = Object.entries(
    groupBy(expenses, (e) => e.category?.name ?? "Uncategorized")
  ).map(([name, rows]) => ({
    name,
    amount: rows.reduce((s, x) => s + Number(x.amount), 0),
  }));

  const lowStock = inventory.filter(
    (i) => i.product && i.stock <= i.product.minimum_stock
  );

  function exportCSV(rows: Record<string, unknown>[], filename: string) {
    if (rows.length === 0) {
      toast.error("Nothing to export");
      return;
    }
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader title="Reports" description="Sales, profit, expenses, and inventory — sliced every way." />

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <Label className="text-xs">From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button variant="outline" onClick={load}>
          Apply
        </Button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          <Loader2Icon className="mr-2 size-4 animate-spin" /> Loading…
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="py-5">
              <CardContent>
                <p className="text-xs text-muted-foreground">Total Sales</p>
                <p className="font-display text-xl font-semibold">{formatCurrency(totalSales)}</p>
              </CardContent>
            </Card>
            <Card className="py-5">
              <CardContent>
                <p className="text-xs text-muted-foreground">Total Profit</p>
                <p className="font-display text-xl font-semibold text-success">
                  {formatCurrency(totalProfit)}
                </p>
              </CardContent>
            </Card>
            <Card className="py-5">
              <CardContent>
                <p className="text-xs text-muted-foreground">Total Expenses</p>
                <p className="font-display text-xl font-semibold text-warning">
                  {formatCurrency(totalExpenses)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="branch">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="branch">Branch Wise</TabsTrigger>
              <TabsTrigger value="manager">Manager Wise</TabsTrigger>
              <TabsTrigger value="product">Product Wise</TabsTrigger>
              <TabsTrigger value="brand">Brand Wise</TabsTrigger>
              <TabsTrigger value="category">Category Wise</TabsTrigger>
              <TabsTrigger value="expense">Expense Report</TabsTrigger>
              <TabsTrigger value="lowstock">Low Stock</TabsTrigger>
            </TabsList>

            <TabsContent value="branch">
              <ReportCard
                title="Branch Wise"
                rows={byBranch}
                columns={["name", "count", "sales", "profit"]}
                onExport={() => exportCSV(byBranch, "branch-report.csv")}
              />
            </TabsContent>
            <TabsContent value="manager">
              <ReportCard
                title="Manager Wise"
                rows={byManager}
                columns={["name", "count", "sales"]}
                onExport={() => exportCSV(byManager, "manager-report.csv")}
              />
            </TabsContent>
            <TabsContent value="product">
              <ReportCard
                title="Product Wise"
                rows={byProduct}
                columns={["name", "qty", "revenue"]}
                onExport={() => exportCSV(byProduct, "product-report.csv")}
              />
            </TabsContent>
            <TabsContent value="brand">
              <ReportCard
                title="Brand Wise"
                rows={byBrand}
                columns={["name", "revenue"]}
                onExport={() => exportCSV(byBrand, "brand-report.csv")}
              />
            </TabsContent>
            <TabsContent value="category">
              <ReportCard
                title="Category Wise"
                rows={byCategory}
                columns={["name", "revenue"]}
                onExport={() => exportCSV(byCategory, "category-report.csv")}
              />
            </TabsContent>
            <TabsContent value="expense">
              <ReportCard
                title="Expense Report"
                rows={byExpenseCategory}
                columns={["name", "amount"]}
                onExport={() => exportCSV(byExpenseCategory, "expense-report.csv")}
              />
            </TabsContent>
            <TabsContent value="lowstock">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-foreground">
                    Low Stock Report
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      exportCSV(
                        lowStock.map((i) => ({
                          product: i.product?.name,
                          branch: i.branch?.name,
                          stock: i.stock,
                          minimum: i.product?.minimum_stock,
                        })),
                        "low-stock-report.csv"
                      )
                    }
                  >
                    <DownloadIcon /> Export
                  </Button>
                </CardHeader>
                <CardContent className="pb-5">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Branch</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Minimum</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lowStock.map((i) => (
                        <TableRow key={i.id}>
                          <TableCell>{i.product?.name}</TableCell>
                          <TableCell>{i.branch?.name}</TableCell>
                          <TableCell>{i.stock}</TableCell>
                          <TableCell>{i.product?.minimum_stock}</TableCell>
                        </TableRow>
                      ))}
                      {lowStock.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            Nothing running low.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function ReportCard({
  title,
  rows,
  columns,
  onExport,
}: {
  title: string;
  rows: Record<string, unknown>[];
  columns: string[];
  onExport: () => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold text-foreground">{title}</CardTitle>
        <Button variant="outline" size="sm" onClick={onExport}>
          <DownloadIcon /> Export
        </Button>
      </CardHeader>
      <CardContent className="pb-5">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c} className="capitalize">
                  {c === "name" ? "Name" : c}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, idx) => (
              <TableRow key={idx}>
                {columns.map((c) => (
                  <TableCell key={c}>
                    {c === "sales" || c === "profit" || c === "revenue" || c === "amount"
                      ? formatCurrency(Number(r[c] ?? 0))
                      : String(r[c] ?? "")}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-muted-foreground">
                  No data for this period.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
