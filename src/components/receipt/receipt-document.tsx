import { ReceiptHeader } from "./receipt-header";
import { ReceiptMeta, ReceiptItems } from "./receipt-items";
import { ReceiptTotals } from "./receipt-totals";
import { ReceiptFooter } from "./receipt-footer";
import type { PaperWidth, ReceiptData } from "@/types";

const WIDTH_PX: Record<PaperWidth, number> = {
  "58mm": 219, // ~58mm at 96dpi print scaling used by most browsers
  "80mm": 302, // ~80mm
};

/**
 * The single source of truth for what a receipt looks like — used both in
 * the on-screen preview modal and, via `#receipt-print-root`, as the only
 * visible content when the browser print dialog is triggered (see the
 * `@media print` rules in globals.css).
 *
 * Always renders on a white background with black text, independent of the
 * app's dark/light theme — real thermal paper has no "dark mode".
 */
export function ReceiptDocument({
  data,
  paperWidth = "80mm",
  id,
}: {
  data: ReceiptData;
  paperWidth?: PaperWidth;
  id?: string;
}) {
  return (
    <div
      id={id}
      className="mx-auto flex flex-col gap-3 bg-white p-4 font-mono text-black"
      style={{ width: WIDTH_PX[paperWidth] }}
    >
      <ReceiptHeader data={data} />
      <div className="border-t border-dashed border-black" />
      <ReceiptMeta data={data} />
      <div className="border-t border-dashed border-black" />
      <ReceiptItems data={data} />
      <div className="border-t border-dashed border-black" />
      <ReceiptTotals data={data} />
      <div className="border-t border-black" />
      <ReceiptFooter data={data} />
    </div>
  );
}
