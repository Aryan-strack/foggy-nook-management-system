"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Loader2Icon, PrinterIcon } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchSales, fetchSaleWithItems } from "@/services/sales";
import { fetchSettings } from "@/services/settings";
import { fetchBranchPrinter } from "@/services/printers";
import { buildReceiptData } from "@/lib/receipt/build-receipt-data";
import { ReceiptPreviewModal } from "@/components/receipt/receipt-preview-modal";
import type { BranchPrinter, ReceiptData, Sale } from "@/types";
import { useAppStore } from "@/store/app-store";
import { formatCurrency } from "@/lib/utils";

const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  completed: "success",
  refunded: "warning",
  cancelled: "destructive",
  partially_refunded: "warning",
};

export default function SalesPage() {
  const profile = useAppStore((s) => s.profile);
  const activeBranchId = useAppStore((s) => s.activeBranchId);
  const branchId = profile?.role === "manager" ? profile.branch_id : activeBranchId;

  const [sales, setSales] = React.useState<Sale[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [reprintingId, setReprintingId] = React.useState<string | null>(null);
  const [receiptData, setReceiptData] = React.useState<ReceiptData | null>(null);
  const [receiptPrinter, setReceiptPrinter] = React.useState<BranchPrinter | null>(null);
  const [receiptOpen, setReceiptOpen] = React.useState(false);

  React.useEffect(() => {
    if (!profile) return;
    setLoading(true);
    fetchSales(branchId, 200)
      .then(setSales)
      .catch((e) => toast.error("Failed to load sales", { description: e.message }))
      .finally(() => setLoading(false));
  }, [profile, branchId]);

  async function handleReprint(sale: Sale) {
    setReprintingId(sale.id);
    try {
      const [full, settings, printer] = await Promise.all([
        fetchSaleWithItems(sale.id),
        fetchSettings().catch(() => null),
        fetchBranchPrinter(sale.branch_id).catch(() => null),
      ]);
      const data = buildReceiptData(full, settings, printer);
      setReceiptData(data);
      setReceiptPrinter(printer);
      setReceiptOpen(true);
    } catch (e) {
      toast.error("Could not load receipt", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setReprintingId(null);
    }
  }

  const columns: ColumnDef<Sale>[] = [
    { accessorKey: "invoice_no", header: "Invoice" },
    {
      id: "branch",
      header: "Branch",
      accessorFn: (r) => r.branch?.name ?? "",
    },
    {
      id: "cashier",
      header: "Cashier",
      accessorFn: (r) => r.cashier?.full_name ?? "",
    },
    {
      accessorKey: "total",
      header: "Total",
      cell: ({ row }) => formatCurrency(row.original.total),
    },
    {
      accessorKey: "profit",
      header: "Profit",
      cell: ({ row }) => formatCurrency(row.original.profit),
    },
    {
      accessorKey: "payment_method",
      header: "Payment",
      cell: ({ row }) => (
        <span className="capitalize">{row.original.payment_method}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={STATUS_VARIANT[row.original.status]}>
          {row.original.status.replace("_", " ")}
        </Badge>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Date",
      cell: ({ row }) =>
        new Date(row.original.created_at).toLocaleString("en-PK", {
          dateStyle: "medium",
          timeStyle: "short",
        }),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleReprint(row.original)}
          disabled={reprintingId === row.original.id}
        >
          {reprintingId === row.original.id ? (
            <Loader2Icon className="animate-spin" />
          ) : (
            <PrinterIcon />
          )}
          Reprint
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Sales"
        description="All completed transactions, refunds, and cancellations."
      />

      {loading ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          <Loader2Icon className="mr-2 size-4 animate-spin" /> Loading…
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={sales}
          searchPlaceholder="Search invoice…"
          emptyMessage="No sales recorded yet."
        />
      )}

      <ReceiptPreviewModal
        data={receiptData}
        printer={receiptPrinter}
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
      />
    </div>
  );
}
