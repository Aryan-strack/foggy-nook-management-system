"use client";

import * as React from "react";
import { PrinterIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { printReceiptEscPos } from "@/lib/escpos/print-service";
import type { BranchPrinter, ReceiptData } from "@/types";

export function PrintReceiptButton({
  data,
  printer,
  onBrowserPrintNeeded,
  label = "Print",
  variant = "gold",
}: {
  data: ReceiptData;
  printer: BranchPrinter | null;
  /** Called when direct printing isn't possible/failed — caller should
   *  trigger window.print() against the visible #receipt-print-root. */
  onBrowserPrintNeeded: () => void;
  label?: string;
  variant?: "gold" | "outline" | "default" | "secondary" | "ghost";
}) {
  const [printing, setPrinting] = React.useState(false);

  async function handlePrint() {
    setPrinting(true);
    try {
      const result = await printReceiptEscPos(data, printer);
      if (result.status === "printed") {
        toast.success(`Printed via ${result.via.toUpperCase()} printer`);
      } else {
        onBrowserPrintNeeded();
      }
    } finally {
      setPrinting(false);
    }
  }

  return (
    <Button variant={variant} onClick={handlePrint} disabled={printing}>
      {printing ? <Loader2Icon className="animate-spin" /> : <PrinterIcon />}
      {label}
    </Button>
  );
}
