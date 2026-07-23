"use client";

import * as React from "react";
import { MinusIcon, PlusIcon, Trash2Icon, Loader2Icon, ShoppingCartIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useCartStore } from "@/store/cart-store";
import { useAppStore } from "@/store/app-store";
import { checkoutSale } from "@/services/sales";
import { formatCurrency } from "@/lib/utils";
import type { CartItem, PaymentMethod, Sale } from "@/types";

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "easypaisa", label: "EasyPaisa" },
  { value: "jazzcash", label: "JazzCash" },
  { value: "mixed", label: "Mixed" },
];

export interface CheckoutContext {
  cartItems: CartItem[];
  customerName: string;
  paidAmount: number;
}

export function CartPanel({
  branchId,
  onCheckoutComplete,
}: {
  branchId: string;
  onCheckoutComplete: (sale: Sale, context: CheckoutContext) => void;
}) {
  const profile = useAppStore((s) => s.profile);
  const {
    items,
    discount,
    taxPercent,
    customerName,
    updateQuantity,
    removeItem,
    setDiscount,
    setTaxPercent,
    setCustomerName,
    subtotal,
    total,
    totalCost,
    clear,
  } = useCartStore();

  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>("cash");
  const [paidAmountInput, setPaidAmountInput] = React.useState("");
  const [checkingOut, setCheckingOut] = React.useState(false);

  const grandTotal = total();
  // Paid amount only matters for cash (change is meaningless for
  // card/EasyPaisa/JazzCash, which are always tendered exactly) — default
  // to the exact total for those methods.
  const paidAmount =
    paymentMethod === "cash" && paidAmountInput !== "" ? Number(paidAmountInput) : grandTotal;
  const change = Math.max(paidAmount - grandTotal, 0);

  async function handleCheckout() {
    if (items.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    if (!profile) return;
    if (paymentMethod === "cash" && paidAmount < grandTotal) {
      toast.error("Paid amount is less than the total");
      return;
    }

    setCheckingOut(true);
    try {
      const sale = await checkoutSale({
        branchId,
        cashierId: profile.id,
        customerName: customerName || null,
        items,
        discount,
        tax: taxPercent,
        paymentMethod,
        paidAmount,
      });
      toast.success(`Sale completed — ${sale.invoice_no}`);
      onCheckoutComplete(sale, { cartItems: items, customerName, paidAmount });
      clear();
      setPaidAmountInput("");
      setPaymentMethod("cash");
    } catch (e) {
      toast.error("Checkout failed", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setCheckingOut(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <ShoppingCartIcon className="size-4 text-accent" />
        <h3 className="font-display font-semibold">Cart</h3>
        <span className="ml-auto text-xs text-muted-foreground">{items.length} item(s)</span>
      </div>

      <div className="flex-1 overflow-y-auto py-3">
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Cart is empty — tap a product to add it.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <li
                key={`${item.product.id}-${item.itemType}`}
                className="flex items-start justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {item.product.name}
                    {item.itemType === "loose" && (
                      <span className="ml-1 text-xs text-accent">(loose)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(item.unitPrice)} × {item.quantity}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-6"
                    onClick={() =>
                      updateQuantity(item.product.id, item.itemType, item.quantity - 1)
                    }
                  >
                    <MinusIcon className="size-3" />
                  </Button>
                  <span className="w-5 text-center text-sm">{item.quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-6"
                    onClick={() =>
                      updateQuantity(item.product.id, item.itemType, item.quantity + 1)
                    }
                  >
                    <PlusIcon className="size-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    onClick={() => removeItem(item.product.id, item.itemType)}
                  >
                    <Trash2Icon className="size-3.5 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Separator />

      <div className="flex flex-col gap-3 pt-3">
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Customer name (optional)</Label>
          <Input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Walk-in customer"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Discount (PKR)</Label>
            <Input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value) || 0)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Tax (%)</Label>
            <Input
              type="number"
              value={taxPercent}
              onChange={(e) => setTaxPercent(Number(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs">Payment method</Label>
          <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {paymentMethod === "cash" && (
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Amount received (PKR)</Label>
            <Input
              type="number"
              value={paidAmountInput}
              onChange={(e) => setPaidAmountInput(e.target.value)}
              placeholder={grandTotal.toFixed(0)}
            />
          </div>
        )}

        <div className="flex flex-col gap-1 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal())}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Estimated profit</span>
            <span>{formatCurrency(subtotal() - totalCost() - discount)}</span>
          </div>
          <div className="flex justify-between font-display text-lg font-semibold">
            <span>Total</span>
            <span className="text-accent">{formatCurrency(grandTotal)}</span>
          </div>
          {paymentMethod === "cash" && change > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Change</span>
              <span>{formatCurrency(change)}</span>
            </div>
          )}
        </div>

        <Button
          variant="gold"
          size="lg"
          className="w-full"
          onClick={handleCheckout}
          disabled={checkingOut || items.length === 0}
        >
          {checkingOut && <Loader2Icon className="animate-spin" />}
          Charge {formatCurrency(grandTotal)}
        </Button>
      </div>
    </div>
  );
}
