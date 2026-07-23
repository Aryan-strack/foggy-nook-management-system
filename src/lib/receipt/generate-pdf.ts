import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { formatCurrency } from "@/lib/utils";
import type { PaperWidth, ReceiptData } from "@/types";

const PAYMENT_LABEL: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  easypaisa: "EasyPaisa",
  jazzcash: "JazzCash",
  mixed: "Mixed",
};

// Millimeters — matches the physical paper roll widths.
const PAGE_WIDTH_MM: Record<PaperWidth, number> = {
  "58mm": 58,
  "80mm": 80,
};

type Op =
  | { type: "center"; text: string; size: number; bold: boolean }
  | { type: "left"; text: string; size: number; bold: boolean }
  | { type: "row"; label: string; value: string; size: number; bold: boolean }
  | { type: "divider"; char: string }
  | { type: "space"; mm: number }
  | { type: "qr"; value: string };

const LINE_HEIGHT = 4.2;

function buildOps(data: ReceiptData): Op[] {
  const ops: Op[] = [];
  const push = (op: Op) => ops.push(op);

  push({ type: "center", text: data.shopName.toUpperCase(), size: 12, bold: true });
  push({ type: "center", text: "Smoke & Vape Shop", size: 8, bold: false });
  push({ type: "center", text: data.branchName, size: 8, bold: false });
  if (data.branchAddress) push({ type: "center", text: data.branchAddress, size: 7, bold: false });
  if (data.branchPhone) push({ type: "center", text: `Tel: ${data.branchPhone}`, size: 7, bold: false });
  push({ type: "space", mm: 1 });

  push({ type: "divider", char: "-" });
  push({ type: "left", text: `Invoice : ${data.invoiceNo}`, size: 8, bold: false });
  const created = new Date(data.createdAt);
  push({
    type: "left",
    text: `Date    : ${created.toLocaleDateString("en-GB")}  ${created.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })}`,
    size: 8,
    bold: false,
  });
  if (data.cashierName) push({ type: "left", text: `Cashier : ${data.cashierName}`, size: 8, bold: false });
  if (data.customerName) push({ type: "left", text: `Customer: ${data.customerName}`, size: 8, bold: false });
  push({ type: "divider", char: "-" });

  for (const item of data.items) {
    push({ type: "left", text: item.name, size: 8, bold: true });
    push({
      type: "row",
      label: `${item.qty} x ${formatCurrency(item.unitPrice)}`,
      value: formatCurrency(item.total),
      size: 7.5,
      bold: false,
    });
  }
  push({ type: "divider", char: "-" });

  push({ type: "row", label: "Subtotal", value: formatCurrency(data.subtotal), size: 8, bold: false });
  if (data.discount > 0)
    push({ type: "row", label: "Discount", value: `-${formatCurrency(data.discount)}`, size: 8, bold: false });
  if (data.tax > 0) push({ type: "row", label: "Tax", value: formatCurrency(data.tax), size: 8, bold: false });
  push({ type: "divider", char: "-" });
  push({ type: "row", label: "Grand Total", value: formatCurrency(data.total), size: 10, bold: true });
  push({ type: "row", label: "Paid", value: formatCurrency(data.paidAmount), size: 8, bold: false });
  if (data.changeAmount > 0)
    push({ type: "row", label: "Change", value: formatCurrency(data.changeAmount), size: 8, bold: false });
  push({
    type: "left",
    text: `Payment : ${PAYMENT_LABEL[data.paymentMethod] ?? data.paymentMethod}`,
    size: 8,
    bold: false,
  });
  push({ type: "divider", char: "=" });

  push({ type: "center", text: "Thank You For Shopping", size: 8, bold: true });
  if (data.footerMessage) push({ type: "center", text: data.footerMessage, size: 7, bold: false });
  if (data.branchWhatsapp) {
    push({ type: "center", text: "WhatsApp", size: 7, bold: false });
    push({ type: "center", text: data.branchWhatsapp, size: 7, bold: false });
  }

  if (data.showQrCode && data.qrValue) {
    push({ type: "space", mm: 2 });
    push({ type: "qr", value: data.qrValue });
  }

  return ops;
}

export async function generateReceiptPdf(
  data: ReceiptData,
  paperWidth: PaperWidth = "80mm"
): Promise<Blob> {
  const width = PAGE_WIDTH_MM[paperWidth];
  const margin = 4;
  const contentWidth = width - margin * 2;
  const qrSize = 22;

  const ops = buildOps(data);

  // Pass 1 — compute total height (each op is one fixed-height line, except
  // "space" and "qr" which have their own explicit height).
  let height = margin;
  for (const op of ops) {
    if (op.type === "space") height += op.mm;
    else if (op.type === "qr") height += qrSize + 2;
    else height += LINE_HEIGHT;
  }
  height += margin;

  const doc = new jsPDF({ unit: "mm", format: [width, height] });
  let y = margin;

  const charsPerLine = Math.floor(contentWidth / 1.6);

  // Pass 2 — actually draw.
  for (const op of ops) {
    if (op.type === "space") {
      y += op.mm;
      continue;
    }
    if (op.type === "divider") {
      doc.setFont("courier", "normal");
      doc.setFontSize(8);
      doc.text(op.char.repeat(charsPerLine), margin, y);
      y += LINE_HEIGHT;
      continue;
    }
    if (op.type === "qr") {
      const qrDataUrl = await QRCode.toDataURL(op.value, { margin: 0, width: 200 });
      doc.addImage(qrDataUrl, "PNG", width / 2 - qrSize / 2, y, qrSize, qrSize);
      y += qrSize + 2;
      continue;
    }
    if (op.type === "center") {
      doc.setFont("courier", op.bold ? "bold" : "normal");
      doc.setFontSize(op.size);
      doc.text(op.text, width / 2, y, { align: "center" });
      y += LINE_HEIGHT;
      continue;
    }
    if (op.type === "left") {
      doc.setFont("courier", op.bold ? "bold" : "normal");
      doc.setFontSize(op.size);
      doc.text(op.text, margin, y);
      y += LINE_HEIGHT;
      continue;
    }
    if (op.type === "row") {
      doc.setFont("courier", op.bold ? "bold" : "normal");
      doc.setFontSize(op.size);
      doc.text(op.label, margin, y);
      doc.text(op.value, width - margin, y, { align: "right" });
      y += LINE_HEIGHT;
      continue;
    }
  }

  return doc.output("blob");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
