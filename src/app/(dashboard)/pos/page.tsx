"use client";

import * as React from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/store/app-store";
import { fetchBranchPosProducts } from "@/services/inventory";
import { fetchSettings } from "@/services/settings";
import { fetchBranchPrinter } from "@/services/printers";
import type { BranchInventory, BranchPrinter, ReceiptData, Sale, Settings } from "@/types";
import { ProductGrid } from "@/components/pos/product-grid";
import { CartPanel, type CheckoutContext } from "@/components/pos/cart-panel";
import { ReceiptPreviewModal } from "@/components/receipt/receipt-preview-modal";
import { ManualSaleDialog } from "@/components/pos/manual-sale-dialog";
import { buildReceiptDataFromCheckout } from "@/lib/receipt/build-receipt-data";
import { printReceiptEscPos } from "@/lib/escpos/print-service";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";

export default function POSPage() {
  const profile = useAppStore((s) => s.profile);
  const branches = useAppStore((s) => s.branches);
  const activeBranchId = useAppStore((s) => s.activeBranchId);
  const setActiveBranchId = useAppStore((s) => s.setActiveBranchId);

  const branchId = profile?.role === "manager" ? profile.branch_id : activeBranchId;
  const branch = branches.find((b) => b.id === branchId) ?? null;

  const [inventory, setInventory] = React.useState<BranchInventory[]>([]);
  const [settings, setSettings] = React.useState<Settings | null>(null);
  const [printer, setPrinter] = React.useState<BranchPrinter | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [receiptData, setReceiptData] = React.useState<ReceiptData | null>(null);
  const [receiptOpen, setReceiptOpen] = React.useState(false);
  const [manualOpen, setManualOpen] = React.useState(false);

  React.useEffect(() => {
    if (!branchId) {
      setInventory([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([fetchBranchPosProducts(branchId), fetchSettings(), fetchBranchPrinter(branchId)])
      .then(([inv, s, p]) => {
        setInventory(inv);
        setSettings(s);
        setPrinter(p);
      })
      .catch((e) => toast.error("Failed to load products", { description: e.message }))
      .finally(() => setLoading(false));
  }, [branchId]);

  async function handleCheckoutComplete(sale: Sale, context: CheckoutContext) {
    const data = buildReceiptDataFromCheckout({
      sale,
      cartItems: context.cartItems,
      customerName: context.customerName,
      branchName: branch?.name ?? "Branch",
      branchAddress: branch?.address ?? null,
      branchPhone: branch?.phone ?? null,
      cashierName: profile?.full_name ?? null,
      settings,
      printer,
    });
    setReceiptData(data);

    const wantsAutoPrint = printer?.auto_print ?? true;
    const wantsPreview = printer?.print_preview ?? true;

    if (wantsPreview) {
      // Show the preview modal — the cashier presses Print / it happens
      // automatically once rendered, per wantsAutoPrint below.
      setReceiptOpen(true);
      if (wantsAutoPrint) {
        // Let the modal mount first so #receipt-print-root exists for the
        // browser-print fallback, then attempt direct ESC/POS printing.
        setTimeout(() => attemptPrint(data), 150);
      }
    } else if (wantsAutoPrint) {
      // No preview requested — print immediately (direct printers only;
      // browser connection type always needs the visible receipt to print,
      // so it still opens the modal briefly in that case).
      if (!printer || printer.connection_type === "browser") {
        setReceiptOpen(true);
        setTimeout(() => attemptPrint(data), 150);
      } else {
        attemptPrint(data);
      }
    }
  }

  async function attemptPrint(data: ReceiptData) {
    const result = await printReceiptEscPos(data, printer);
    if (result.status === "printed") {
      toast.success(`Receipt printed via ${result.via.toUpperCase()}`);
      // Return straight to the POS screen once a direct printer has
      // finished — no need to keep the preview open.
      setReceiptOpen(false);
    } else if (!printer || printer.connection_type === "browser") {
      requestAnimationFrame(() => window.print());
    }
  }

  if (!branchId) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-muted-foreground">Select a branch to start selling.</p>
        <Select value={activeBranchId ?? undefined} onValueChange={setActiveBranchId}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Choose a branch" />
          </SelectTrigger>
          <SelectContent>
            {branches.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className="grid h-[calc(100vh-8rem)] grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
      <div className="min-h-0">
        {loading ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            <Loader2Icon className="mr-2 size-4 animate-spin" /> Loading products…
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">Products</h3>
              <Button variant="outline" size="sm" onClick={() => setManualOpen(true)}>
                <PlusIcon className="mr-1.5 size-4" />
                Manual Sale
              </Button>
            </div>
            <ProductGrid inventory={inventory} />
          </>
        )}
      </div>
      <div className="rounded-xl border bg-card p-4">
        <CartPanel branchId={branchId} onCheckoutComplete={handleCheckoutComplete} />
      </div>

      <ManualSaleDialog
        open={manualOpen}
        onOpenChange={setManualOpen}
        branchId={branchId}
        onComplete={() => {
          setManualOpen(false);
        }}
      />

      <ReceiptPreviewModal
        data={receiptData}
        printer={printer}
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
      />
    </div>
  );
}
