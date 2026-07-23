import { create } from "zustand";
import type { CartItem, Product, SaleItemType } from "@/types";

interface CartState {
  items: CartItem[];
  discount: number;
  taxPercent: number;
  customerName: string;
  addItem: (product: Product, itemType: SaleItemType, quantity: number) => void;
  addManualItem: (params: {
    name: string;
    quantity: number;
    unitPrice: number;
    unitCost: number;
    discount: number;
  }) => void;
  updateQuantity: (productId: string, itemType: SaleItemType, quantity: number) => void;
  removeItem: (productId: string, itemType: SaleItemType) => void;
  setDiscount: (discount: number) => void;
  setTaxPercent: (tax: number) => void;
  setCustomerName: (name: string) => void;
  clear: () => void;
  subtotal: () => number;
  total: () => number;
  totalCost: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  discount: 0,
  taxPercent: 0,
  customerName: "",

  addItem: (product, itemType, quantity) => {
    const price = itemType === "loose"
      ? (product.loose_selling_price ?? product.selling_price)
      : product.selling_price;
    const unitCost = itemType === "loose"
      ? product.cost_price / Math.max(product.quantity_per_pack, 1)
      : product.cost_price;

    set((state) => {
      const existing = state.items.find(
        (i) => i.product.id === product.id && i.itemType === itemType
      );
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.product.id === product.id && i.itemType === itemType
              ? { ...i, quantity: i.quantity + quantity }
              : i
          ),
        };
      }
      return {
        items: [
          ...state.items,
          { product, itemType, quantity, unitPrice: price, unitCost, discount: 0, isManual: false },
        ],
      };
    });
  },

  addManualItem: ({ name, quantity, unitPrice, unitCost, discount }) => {
    const manualProduct: Product = {
      id: "manual",
      name,
      sku: "MANUAL",
      barcode: null,
      image_url: null,
      brand_id: null,
      category_id: null,
      cost_price: unitCost,
      selling_price: unitPrice,
      loose_selling_price: null,
      quantity_per_pack: 1,
      is_loose_saleable: false,
      minimum_stock: 0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      brand: null,
      category: null,
    };

    set((state) => ({
      items: [
        ...state.items,
        {
          product: manualProduct,
          itemType: "unit",
          quantity,
          unitPrice,
          unitCost,
          discount,
          isManual: true,
        },
      ],
    }));
  },

  updateQuantity: (productId, itemType, quantity) =>
    set((state) => ({
      items: state.items
        .map((i) =>
          i.product.id === productId && i.itemType === itemType ? { ...i, quantity } : i
        )
        .filter((i) => i.quantity > 0),
    })),

  removeItem: (productId, itemType) =>
    set((state) => ({
      items: state.items.filter(
        (i) => !(i.product.id === productId && i.itemType === itemType)
      ),
    })),

  setDiscount: (discount) => set({ discount }),
  setTaxPercent: (taxPercent) => set({ taxPercent }),
  setCustomerName: (customerName) => set({ customerName }),
  clear: () => set({ items: [], discount: 0, taxPercent: 0, customerName: "" }),

  subtotal: () =>
    get().items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),

  totalCost: () =>
    get().items.reduce((sum, i) => sum + i.unitCost * i.quantity, 0),

  total: () => {
    const { subtotal, discount, taxPercent } = get();
    const sub = subtotal();
    const taxed = sub - discount;
    return taxed + (taxed * taxPercent) / 100;
  },
}));
