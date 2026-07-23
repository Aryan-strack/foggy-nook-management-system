import { createClient } from "@/lib/supabase/client";
import type { BranchInventory, Expense, Sale } from "@/types";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return startOfDay(d);
}

export interface DashboardMetrics {
  todaySales: number;
  todayProfit: number;
  todayExpenses: number;
  weekSales: number;
  weekProfit: number;
  monthSales: number;
  monthProfit: number;
  monthExpenses: number;
  totalProducts: number;
  totalBrands: number;
  totalCategories: number;
  inventoryValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  topProducts: { name: string; qty: number; revenue: number }[];
  recentSales: Sale[];
  recentExpenses: Expense[];
  dailySalesSeries: { date: string; sales: number; profit: number }[];
  branchComparison: { branch: string; sales: number }[];
}

export async function fetchDashboardMetrics(
  branchId: string | null
): Promise<DashboardMetrics> {
  const supabase = createClient();
  const since30 = daysAgo(30).toISOString();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const weekStart = daysAgo(6);
  const todayStart = startOfDay(new Date());

  let salesQuery = supabase
    .from("sales")
    .select("*, branch:branches(*)")
    .gte("created_at", since30)
    .eq("status", "completed");
  if (branchId) salesQuery = salesQuery.eq("branch_id", branchId);

  let expensesQuery = supabase
    .from("expenses")
    .select("*, category:expense_categories(*)")
    .gte("expense_date", monthStart.toISOString().slice(0, 10));
  if (branchId) expensesQuery = expensesQuery.eq("branch_id", branchId);

  let inventoryQuery = supabase
    .from("branch_inventory")
    .select("*, product:products(*, brand:brands(*), category:categories(*))");
  if (branchId) inventoryQuery = inventoryQuery.eq("branch_id", branchId);

  const [salesRes, expensesRes, inventoryRes, productsRes, brandsRes, categoriesRes] =
    await Promise.all([
      salesQuery,
      expensesQuery,
      inventoryQuery,
      supabase.from("products").select("id", { count: "exact", head: true }),
      supabase.from("brands").select("id", { count: "exact", head: true }),
      supabase.from("categories").select("id", { count: "exact", head: true }),
    ]);

  const sales = (salesRes.data ?? []) as unknown as Sale[];
  const expenses = (expensesRes.data ?? []) as unknown as Expense[];
  const inventory = (inventoryRes.data ?? []) as unknown as BranchInventory[];

  const todaySales = sales.filter((s) => new Date(s.created_at) >= todayStart);
  const weekSales = sales.filter((s) => new Date(s.created_at) >= weekStart);
  const monthSales = sales.filter((s) => new Date(s.created_at) >= monthStart);
  const todayExpenses = expenses.filter(
    (e) => new Date(e.expense_date) >= todayStart
  );

  const sum = (arr: { total: number }[]) => arr.reduce((s, x) => s + Number(x.total), 0);
  const sumProfit = (arr: { profit: number }[]) =>
    arr.reduce((s, x) => s + Number(x.profit), 0);
  const sumExp = (arr: { amount: number }[]) =>
    arr.reduce((s, x) => s + Number(x.amount), 0);

  const inventoryValue = inventory.reduce(
    (s, i) => s + (i.product?.cost_price ?? 0) * i.stock,
    0
  );
  const lowStockCount = inventory.filter(
    (i) => i.stock > 0 && i.stock <= (i.product?.minimum_stock ?? 0)
  ).length;
  const outOfStockCount = inventory.filter((i) => i.stock <= 0).length;

  // daily series for last 14 days
  const dailyMap = new Map<string, { sales: number; profit: number }>();
  for (let i = 13; i >= 0; i--) {
    const key = daysAgo(i).toISOString().slice(0, 10);
    dailyMap.set(key, { sales: 0, profit: 0 });
  }
  for (const s of sales) {
    const key = s.created_at.slice(0, 10);
    if (dailyMap.has(key)) {
      const entry = dailyMap.get(key)!;
      entry.sales += Number(s.total);
      entry.profit += Number(s.profit);
    }
  }
  const dailySalesSeries = Array.from(dailyMap.entries()).map(([date, v]) => ({
    date: date.slice(5),
    ...v,
  }));

  // top products — needs sale_items; fetch separately scoped to the same sale ids
  const saleIds = sales.map((s) => s.id);
  let topProducts: DashboardMetrics["topProducts"] = [];
  if (saleIds.length > 0) {
    const { data: items } = await supabase
      .from("sale_items")
      .select("quantity, total, product:products(name)")
      .in("sale_id", saleIds);
    const map = new Map<string, { qty: number; revenue: number }>();
    for (const it of (items ?? []) as unknown as {
      quantity: number;
      total: number;
      product: { name: string } | null;
    }[]) {
      const name = it.product?.name ?? "Unknown";
      const entry = map.get(name) ?? { qty: 0, revenue: 0 };
      entry.qty += Number(it.quantity);
      entry.revenue += Number(it.total);
      map.set(name, entry);
    }
    topProducts = Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }

  // branch comparison (only meaningful without a branch filter)
  const branchMap = new Map<string, number>();
  for (const s of sales) {
    const name = s.branch?.name ?? "Unknown";
    branchMap.set(name, (branchMap.get(name) ?? 0) + Number(s.total));
  }
  const branchComparison = Array.from(branchMap.entries()).map(([branch, sales]) => ({
    branch,
    sales,
  }));

  return {
    todaySales: sum(todaySales),
    todayProfit: sumProfit(todaySales),
    todayExpenses: sumExp(todayExpenses),
    weekSales: sum(weekSales),
    weekProfit: sumProfit(weekSales),
    monthSales: sum(monthSales),
    monthProfit: sumProfit(monthSales),
    monthExpenses: sumExp(expenses),
    totalProducts: productsRes.count ?? 0,
    totalBrands: brandsRes.count ?? 0,
    totalCategories: categoriesRes.count ?? 0,
    inventoryValue,
    lowStockCount,
    outOfStockCount,
    topProducts,
    recentSales: sales
      .slice()
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
      .slice(0, 5),
    recentExpenses: expenses
      .slice()
      .sort((a, b) => +new Date(b.expense_date) - +new Date(a.expense_date))
      .slice(0, 5),
    dailySalesSeries,
    branchComparison,
  };
}
