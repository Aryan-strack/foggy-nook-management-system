import type { BranchPrinter, CartItem, ReceiptData, Sale, Settings } from "@/types";

export function buildReceiptData(
  sale: Sale,
  settings: Settings | null,
  printer: BranchPrinter | null
): ReceiptData {
  return {
    invoiceNo: sale.invoice_no,
    createdAt: sale.created_at,
    branchName: sale.branch?.name ?? "Branch",
    branchAddress: printer?.store_address ?? sale.branch?.address ?? settings?.address ?? null,
    branchPhone: printer?.phone ?? sale.branch?.phone ?? settings?.phone ?? null,
    branchWhatsapp: printer?.whatsapp ?? settings?.whatsapp ?? null,
    cashierName: sale.cashier?.full_name ?? null,
    customerName: sale.customer_name ?? null,
    shopName: settings?.shop_name ?? "Foggy Nook",
    logoUrl: printer?.header_logo_url ?? settings?.logo_url ?? null,
    items: (sale.items ?? []).map((item) => ({
      name: item.product?.name ?? "Item",
      qty: item.quantity,
      unitPrice: item.unit_price,
      discount: item.discount,
      total: item.total,
    })),
    subtotal: sale.subtotal,
    discount: sale.discount,
    tax: sale.tax,
    total: sale.total,
    paidAmount: sale.paid_amount ?? sale.total,
    changeAmount: sale.change_amount,
    paymentMethod: sale.payment_method,
    footerMessage: printer?.footer_message ?? settings?.receipt_footer ?? null,
    showQrCode: printer?.show_qr_code ?? settings?.default_show_qr_code ?? false,
    qrValue: printer?.qr_value ?? settings?.default_qr_value ?? null,
  };
}

/**
 * Builds ReceiptData right after checkout using the cart items still held
 * client-side, so the receipt can render/print instantly without an extra
 * round-trip to re-fetch sale_items (checkout_sale only returns the sales
 * row itself).
 */
export function buildReceiptDataFromCheckout(params: {
  sale: Sale;
  cartItems: CartItem[];
  customerName: string;
  branchName: string;
  branchAddress: string | null;
  branchPhone: string | null;
  cashierName: string | null;
  settings: Settings | null;
  printer: BranchPrinter | null;
}): ReceiptData {
  const { sale, cartItems, customerName, branchName, branchAddress, branchPhone, cashierName, settings, printer } =
    params;

  return {
    invoiceNo: sale.invoice_no,
    createdAt: sale.created_at,
    branchName,
    branchAddress: printer?.store_address ?? branchAddress ?? settings?.address ?? null,
    branchPhone: printer?.phone ?? branchPhone ?? settings?.phone ?? null,
    branchWhatsapp: printer?.whatsapp ?? settings?.whatsapp ?? null,
    cashierName,
    customerName: customerName || null,
    shopName: settings?.shop_name ?? "Foggy Nook",
    logoUrl: printer?.header_logo_url ?? settings?.logo_url ?? null,
    items: cartItems.map((item) => ({
      name: item.product.name,
      qty: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
      total: item.unitPrice * item.quantity - item.discount,
    })),
    subtotal: sale.subtotal,
    discount: sale.discount,
    tax: sale.tax,
    total: sale.total,
    paidAmount: sale.paid_amount ?? sale.total,
    changeAmount: sale.change_amount,
    paymentMethod: sale.payment_method,
    footerMessage: printer?.footer_message ?? settings?.receipt_footer ?? null,
    showQrCode: printer?.show_qr_code ?? settings?.default_show_qr_code ?? false,
    qrValue: printer?.qr_value ?? settings?.default_qr_value ?? null,
  };
}
