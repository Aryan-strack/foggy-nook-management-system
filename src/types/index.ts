export type UserRole = "super_admin" | "admin" | "manager";

export type InventoryMovementType =
  | "stock_in"
  | "stock_out"
  | "adjustment"
  | "damaged"
  | "expired"
  | "returned"
  | "transfer_in"
  | "transfer_out"
  | "sale";

export type SaleStatus = "completed" | "refunded" | "cancelled" | "partially_refunded";
export type PaymentMethod = "cash" | "card" | "easypaisa" | "jazzcash" | "mixed";
export type SaleItemType = "unit" | "loose";
export type PaperWidth = "58mm" | "80mm";
export type PrinterConnectionType = "browser" | "usb" | "network" | "bluetooth";

export interface Branch {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  phone: string | null;
  city: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  branch_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  branch?: Branch | null;
}

export interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  image_url: string | null;
  brand_id: string | null;
  category_id: string | null;
  cost_price: number;
  selling_price: number;
  loose_selling_price: number | null;
  quantity_per_pack: number;
  is_loose_saleable: boolean;
  minimum_stock: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  brand?: Brand | null;
  category?: Category | null;
}

export interface BranchInventory {
  id: string;
  branch_id: string;
  product_id: string;
  stock: number;
  loose_stock: number;
  updated_at: string;
  product?: Product;
  branch?: Branch;
}

export interface InventoryLog {
  id: string;
  branch_id: string;
  product_id: string;
  movement_type: InventoryMovementType;
  quantity: number;
  stock_before: number;
  stock_after: number;
  reference_id: string | null;
  transfer_to_branch_id: string | null;
  reason: string | null;
  performed_by: string | null;
  created_at: string;
  product?: Product;
}

export interface Customer {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  branch_id: string | null;
  total_spent: number;
  created_at: string;
}

export interface Sale {
  id: string;
  invoice_no: string;
  branch_id: string;
  cashier_id: string | null;
  customer_id: string | null;
  customer_name: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  total_cost: number;
  profit: number;
  paid_amount: number | null;
  change_amount: number;
  payment_method: PaymentMethod;
  payment_breakdown: Record<string, number> | null;
  status: SaleStatus;
  notes: string | null;
  created_at: string;
  branch?: Branch;
  cashier?: Profile;
  items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  item_type: SaleItemType;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  discount: number;
  total: number;
  custom_item_name: string | null;
  created_at: string;
  product?: Product;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  is_active: boolean;
}

export interface Expense {
  id: string;
  branch_id: string;
  category_id: string | null;
  title: string;
  amount: number;
  description: string | null;
  expense_date: string;
  created_by: string | null;
  created_at: string;
  branch?: Branch;
  category?: ExpenseCategory;
}

export interface ActivityLog {
  id: string;
  actor_id: string | null;
  branch_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  actor?: Profile;
  branch?: Branch;
}

export interface AppNotification {
  id: string;
  branch_id: string | null;
  recipient_id: string | null;
  type: string;
  title: string;
  message: string | null;
  is_read: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Settings {
  id: number;
  shop_name: string;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  tax_percent: number;
  currency: string;
  receipt_footer: string | null;
  daily_target: number | null;
  monthly_target: number | null;
  default_paper_width: PaperWidth;
  default_auto_print: boolean;
  default_print_preview: boolean;
  default_font_size: number;
  default_left_margin: number;
  default_show_qr_code: boolean;
  default_qr_value: string | null;
  default_open_cash_drawer: boolean;
  updated_at: string;
}

export interface BranchPrinter {
  id: string;
  branch_id: string;
  printer_name: string | null;
  connection_type: PrinterConnectionType;
  paper_width: PaperWidth;
  auto_print: boolean;
  print_preview: boolean;
  open_cash_drawer: boolean;
  header_logo_url: string | null;
  footer_message: string | null;
  show_qr_code: boolean;
  qr_value: string | null;
  font_size: number;
  left_margin: number;
  store_address: string | null;
  phone: string | null;
  whatsapp: string | null;
  usb_vendor_id: number | null;
  usb_product_id: number | null;
  bluetooth_device_id: string | null;
  bluetooth_device_name: string | null;
  network_ip: string | null;
  network_port: number | null;
  updated_at: string;
  branch?: Branch;
}

// Cart item used client-side in the POS before checkout
export interface CartItem {
  product: Product;
  itemType: SaleItemType;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  discount: number;
  isManual?: boolean;
}

// Normalized shape consumed by all Receipt* components — built either from
// a freshly completed checkout or from a historical Sale for reprints.
export interface ReceiptData {
  invoiceNo: string;
  createdAt: string;
  branchName: string;
  branchAddress: string | null;
  branchPhone: string | null;
  branchWhatsapp: string | null;
  cashierName: string | null;
  customerName: string | null;
  shopName: string;
  logoUrl: string | null;
  items: {
    name: string;
    qty: number;
    unitPrice: number;
    discount: number;
    total: number;
  }[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paidAmount: number;
  changeAmount: number;
  paymentMethod: PaymentMethod;
  footerMessage: string | null;
  showQrCode: boolean;
  qrValue: string | null;
}
