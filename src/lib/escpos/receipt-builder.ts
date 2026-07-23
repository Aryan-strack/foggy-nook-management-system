import { EscPosBuilder } from "./commands";
import { buildQrCodeBytes } from "./qrcode";
import { formatCurrency } from "@/lib/utils";
import type { BranchPrinter, PaperWidth, ReceiptData } from "@/types";

// Standard font-A character widths for common thermal paper sizes.
const CHAR_WIDTH: Record<PaperWidth, number> = {
  "58mm": 32,
  "80mm": 48,
};

const PAYMENT_LABEL: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  easypaisa: "EasyPaisa",
  jazzcash: "JazzCash",
  mixed: "Mixed",
};

function wrapText(value: string, width: number): string[] {
  if (value.length <= width) return [value];
  const words = value.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > width) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = (current + " " + word).trim();
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Renders the item table honoring column widths for the given paper size.
 * Layout: Product name (wraps to its own line if long), then
 * "Qty x Price ... Total" aligned right.
 */
function itemLines(
  items: ReceiptData["items"],
  width: number
): { name: string; meta: string }[] {
  return items.map((item) => {
    const qtyPrice = `${item.qty} x ${formatCurrency(item.unitPrice)}`;
    const total = formatCurrency(item.total);
    const space = Math.max(width - qtyPrice.length - total.length, 1);
    return {
      name: item.name,
      meta: qtyPrice + " ".repeat(space) + total,
    };
  });
}

export interface EscPosOptions {
  paperWidth: PaperWidth;
  fontSize: number; // 0 normal, 1 large (matches BranchPrinter.font_size)
  leftMargin: number;
  openCashDrawer: boolean;
  showQrCode: boolean;
  qrValue: string | null;
}

export function escPosOptionsFromPrinter(printer: BranchPrinter | null): EscPosOptions {
  return {
    paperWidth: printer?.paper_width ?? "80mm",
    fontSize: printer?.font_size ?? 0,
    leftMargin: printer?.left_margin ?? 0,
    openCashDrawer: printer?.open_cash_drawer ?? false,
    showQrCode: printer?.show_qr_code ?? false,
    qrValue: printer?.qr_value ?? null,
  };
}

export function buildReceiptEscPos(data: ReceiptData, options: EscPosOptions): Uint8Array {
  const width = CHAR_WIDTH[options.paperWidth];
  const margin = " ".repeat(Math.max(options.leftMargin, 0));
  const b = new EscPosBuilder().init();

  const withMargin = (line: string) => margin + line;

  // ---- Header ----
  b.align("center");
  if (options.fontSize > 0) b.size(2, 2);
  b.bold(true).line(data.shopName.toUpperCase()).bold(false);
  if (options.fontSize > 0) b.resetSize();
  b.line("Smoke & Vape Shop");
  b.line(data.branchName);
  if (data.branchAddress) {
    for (const l of wrapText(data.branchAddress, width)) b.line(l);
  }
  if (data.branchPhone) b.line(`Tel: ${data.branchPhone}`);
  if (data.branchWhatsapp) b.line(`WhatsApp: ${data.branchWhatsapp}`);
  b.feed(1);

  // ---- Meta ----
  b.align("left");
  b.line(withMargin(`Invoice : ${data.invoiceNo}`));
  const created = new Date(data.createdAt);
  b.line(
    withMargin(
      `Date    : ${created.toLocaleDateString("en-GB")}  ${created.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })}`
    )
  );
  if (data.cashierName) b.line(withMargin(`Cashier : ${data.cashierName}`));
  if (data.customerName) b.line(withMargin(`Customer: ${data.customerName}`));
  b.divider(width, "-");

  // ---- Items ----
  for (const item of itemLines(data.items, width)) {
    for (const l of wrapText(item.name, width)) b.line(withMargin(l));
    b.line(withMargin(item.meta));
  }
  b.divider(width, "-");

  // ---- Totals ----
  b.row("Subtotal", formatCurrency(data.subtotal), width);
  if (data.discount > 0) b.row("Discount", `-${formatCurrency(data.discount)}`, width);
  if (data.tax > 0) b.row("Tax", formatCurrency(data.tax), width);
  b.divider(width, "-");
  b.bold(true);
  if (options.fontSize > 0) b.size(2, 1);
  b.row("Grand Total", formatCurrency(data.total), width);
  if (options.fontSize > 0) b.resetSize();
  b.bold(false);
  b.row("Paid", formatCurrency(data.paidAmount), width);
  if (data.changeAmount > 0) {
    b.row("Change", formatCurrency(data.changeAmount), width);
  }
  b.line(withMargin(`Payment : ${PAYMENT_LABEL[data.paymentMethod] ?? data.paymentMethod}`));
  b.divider(width, "=");

  // ---- Footer ----
  b.align("center");
  b.line("Thank You For Shopping");
  if (data.footerMessage) {
    for (const l of wrapText(data.footerMessage, width)) b.line(l);
  }
  if (data.branchWhatsapp) {
    b.line("WhatsApp");
    b.line(data.branchWhatsapp);
  }
  b.feed(1);

  if (options.showQrCode && data.qrValue) {
    b.raw(buildQrCodeBytes(data.qrValue));
    b.feed(1);
  }

  b.feed(2);
  if (options.openCashDrawer) b.openCashDrawer();
  b.cut();

  return b.build();
}
