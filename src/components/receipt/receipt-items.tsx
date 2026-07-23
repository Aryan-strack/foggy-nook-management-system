import { formatCurrency } from "@/lib/utils";
import type { ReceiptData } from "@/types";

export function ReceiptMeta({ data }: { data: ReceiptData }) {
  const created = new Date(data.createdAt);
  return (
    <div className="flex flex-col gap-0.5 text-[11px]">
      <div className="flex justify-between">
        <span>Invoice</span>
        <span>{data.invoiceNo}</span>
      </div>
      <div className="flex justify-between">
        <span>Date</span>
        <span>
          {created.toLocaleDateString("en-GB")}{" "}
          {created.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
      {data.cashierName && (
        <div className="flex justify-between">
          <span>Cashier</span>
          <span>{data.cashierName}</span>
        </div>
      )}
      {data.customerName && (
        <div className="flex justify-between">
          <span>Customer</span>
          <span>{data.customerName}</span>
        </div>
      )}
    </div>
  );
}

export function ReceiptItems({ data }: { data: ReceiptData }) {
  return (
    <div className="flex flex-col gap-1.5 text-[11px]">
      {data.items.map((item, idx) => (
        <div key={idx} className="flex flex-col">
          <span className="font-medium">{item.name}</span>
          <div className="flex justify-between text-muted-foreground">
            <span>
              {item.qty} &times; {formatCurrency(item.unitPrice)}
              {item.discount > 0 && ` (-${formatCurrency(item.discount)})`}
            </span>
            <span className="font-medium text-foreground">{formatCurrency(item.total)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
