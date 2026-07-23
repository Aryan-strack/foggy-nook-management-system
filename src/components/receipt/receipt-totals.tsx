import { formatCurrency } from "@/lib/utils";
import type { ReceiptData } from "@/types";

const PAYMENT_LABEL: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  easypaisa: "EasyPaisa",
  jazzcash: "JazzCash",
  mixed: "Mixed",
};

export function ReceiptTotals({ data }: { data: ReceiptData }) {
  return (
    <div className="flex flex-col gap-1 text-[11px]">
      <div className="flex justify-between">
        <span>Subtotal</span>
        <span>{formatCurrency(data.subtotal)}</span>
      </div>
      {data.discount > 0 && (
        <div className="flex justify-between">
          <span>Discount</span>
          <span>-{formatCurrency(data.discount)}</span>
        </div>
      )}
      {data.tax > 0 && (
        <div className="flex justify-between">
          <span>Tax</span>
          <span>{formatCurrency(data.tax)}</span>
        </div>
      )}
      <div className="my-1 border-t border-dashed border-current" />
      <div className="flex justify-between text-sm font-bold">
        <span>Grand Total</span>
        <span>{formatCurrency(data.total)}</span>
      </div>
      <div className="flex justify-between">
        <span>Paid</span>
        <span>{formatCurrency(data.paidAmount)}</span>
      </div>
      {data.changeAmount > 0 && (
        <div className="flex justify-between">
          <span>Change</span>
          <span>{formatCurrency(data.changeAmount)}</span>
        </div>
      )}
      <div className="flex justify-between">
        <span>Payment</span>
        <span>{PAYMENT_LABEL[data.paymentMethod] ?? data.paymentMethod}</span>
      </div>
    </div>
  );
}
