"use client";

import * as React from "react";
import { MessageCircleIcon, DownloadIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ReceiptDocument } from "./receipt-document";
import { PrintReceiptButton } from "./print-receipt-button";
import { generateReceiptPdf, downloadBlob } from "@/lib/receipt/generate-pdf";
import type { BranchPrinter, ReceiptData } from "@/types";

export function ReceiptPreviewModal({
  data,
  printer,
  open,
  onOpenChange,
}: {
  data: ReceiptData | null;
  printer: BranchPrinter | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [downloading, setDownloading] = React.useState(false);
  const paperWidth = printer?.paper_width ?? "80mm";

  function triggerBrowserPrint() {
    // A tick so the dialog/print-root has settled before the print dialog opens.
    requestAnimationFrame(() => window.print());
  }

  async function handleDownloadPdf() {
    if (!data) return;
    setDownloading(true);
    try {
      const blob = await generateReceiptPdf(data, paperWidth);
      downloadBlob(blob, `${data.invoiceNo}.pdf`);
    } catch {
      toast.error("Could not generate PDF");
    } finally {
      setDownloading(false);
    }
  }

  function handleWhatsApp() {
    if (!data) return;
    const text = encodeURIComponent(
      `${data.shopName} Receipt\nInvoice: ${data.invoiceNo}\nTotal: PKR ${data.total.toFixed(
        0
      )}\nThank you for shopping with us!`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  return (
    <Dialog open={open && !!data} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Receipt — {data?.invoiceNo}</DialogTitle>
        </DialogHeader>

        {data && (
          <div className="max-h-[60vh] overflow-y-auto rounded-md border">
            <ReceiptDocument data={data} paperWidth={paperWidth} id="receipt-print-root" />
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleWhatsApp}>
            <MessageCircleIcon /> WhatsApp
          </Button>
          <Button variant="outline" onClick={handleDownloadPdf} disabled={downloading}>
            {downloading ? <Loader2Icon className="animate-spin" /> : <DownloadIcon />}
            Download PDF
          </Button>
          {data && (
            <PrintReceiptButton
              data={data}
              printer={printer}
              onBrowserPrintNeeded={triggerBrowserPrint}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
