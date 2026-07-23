"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Loader2Icon, SlidersHorizontalIcon } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StockAdjustDialog } from "@/components/products/stock-adjust-dialog";
import { fetchBranchInventory } from "@/services/inventory";
import type { BranchInventory } from "@/types";
import { useAppStore } from "@/store/app-store";
import { formatCurrency } from "@/lib/utils";

export default function InventoryPage() {
  const profile = useAppStore((s) => s.profile);
  const activeBranchId = useAppStore((s) => s.activeBranchId);
  const branchId = profile?.role === "manager" ? profile.branch_id : activeBranchId;

  const [rows, setRows] = React.useState<BranchInventory[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [adjustRow, setAdjustRow] = React.useState<BranchInventory | null>(null);

  const load = React.useCallback(() => {
    if (!profile) return;
    setLoading(true);
    fetchBranchInventory(branchId)
      .then(setRows)
      .catch((e) => toast.error("Failed to load inventory", { description: e.message }))
      .finally(() => setLoading(false));
  }, [branchId, profile]);

  React.useEffect(load, [load]);

  const columns: ColumnDef<BranchInventory>[] = [
    {
      id: "name",
      header: "Product",
      accessorFn: (r) => r.product?.name ?? "",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.product?.name}</span>
          <span className="text-xs text-muted-foreground">
            {row.original.product?.brand?.name} · {row.original.product?.category?.name}
          </span>
        </div>
      ),
    },
    ...(!branchId
      ? [
          {
            id: "branch",
            header: "Branch",
            accessorFn: (r: BranchInventory) => r.branch?.name ?? "",
          } as ColumnDef<BranchInventory>,
        ]
      : []),
    {
      accessorKey: "stock",
      header: "Stock (packs)",
      cell: ({ row }) => {
        const min = row.original.product?.minimum_stock ?? 0;
        const stock = row.original.stock;
        const tone =
          stock <= 0 ? "destructive" : stock <= min ? "warning" : "success";
        return <Badge variant={tone}>{stock}</Badge>;
      },
    },
    {
      accessorKey: "loose_stock",
      header: "Loose pcs",
      cell: ({ row }) =>
        row.original.product?.is_loose_saleable ? (
          row.original.loose_stock
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "value",
      header: "Stock Value",
      cell: ({ row }) =>
        formatCurrency((row.original.product?.cost_price ?? 0) * row.original.stock),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAdjustRow(row.original)}
          disabled={!branchId}
        >
          <SlidersHorizontalIcon /> Adjust
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Inventory"
        description={
          branchId
            ? "Stock levels for the selected branch."
            : "Combined stock across all branches. Select a branch to adjust stock."
        }
      />

      {loading ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          <Loader2Icon className="mr-2 size-4 animate-spin" /> Loading…
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          searchPlaceholder="Search inventory…"
          emptyMessage="No inventory records yet — add stock for your products."
        />
      )}

      <StockAdjustDialog
        open={!!adjustRow}
        onOpenChange={(o) => !o && setAdjustRow(null)}
        row={adjustRow}
        branchId={branchId ?? ""}
        onSaved={load}
      />
    </div>
  );
}
