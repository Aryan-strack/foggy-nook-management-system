"use client";

import * as React from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { createManualSale } from "@/services/sales";
import { useAppStore } from "@/store/app-store";
import { useCartStore } from "@/store/cart-store";
import type { PaymentMethod } from "@/types";

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "easypaisa", label: "EasyPaisa" },
  { value: "jazzcash", label: "JazzCash" },
  { value: "mixed", label: "Mixed" },
];

export function ManualSaleDialog({
  open,
  onOpenChange,
  branchId,
  onComplete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  onComplete: () => void;
}) {
  const profile = useAppStore((s) => s.profile);
  const clear = useCartStore((s) => s.clear);
  const [productName, setProductName] = React.useState("");
  const [quantity, setQuantity] = React.useState("1");
  const [unitPrice, setUnitPrice] = React.useState("");
  const [unitCost, setUnitCost] = React.useState("");
  const [discount, setDiscount] = React.useState("0");
  const [notes, setNotes] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>("cash");
  const [paidAmount, setPaidAmount] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setProductName("");
      setQuantity("1");
      setUnitPrice("");
      setUnitCost("");
      setDiscount("0");
      setNotes("");
      setPaymentMethod("cash");
      setPaidAmount("");
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;

    const qty = Number(quantity);
    const price = Number(unitPrice);
    const cost = Number(unitCost);
    const disc = Number(discount) || 0;

    if (!productName.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (!qty || qty <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }
    if (isNaN(price) || price < 0) {
      toast.error("Enter a valid unit price");
      return;
    }
    if (isNaN(cost) || cost < 0) {
      toast.error("Enter a valid unit cost");
      return;
    }

    setSaving(true);
    try {
      const paid = paymentMethod === "cash" ? Number(paidAmount) || price * qty - disc : price * qty - disc;
      await createManualSale({
        branchId,
        cashierId: profile.id,
        productName: productName.trim(),
        quantity: qty,
        unitPrice: price,
        unitCost: cost,
        discount: disc,
        customerName: null,
        paymentMethod,
        paidAmount: paid,
        notes: notes.trim() || undefined,
      });
      toast.success("Manual sale completed");
      clear();
      onOpenChange(false);
      onComplete();
    } catch (err) {
      toast.error("Manual sale failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setSaving(false);
    }
  }

  const total = Number(quantity || 0) * Number(unitPrice || 0) - Number(discount || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manual Sale</DialogTitle>
          <DialogDescription>
            Create a sale for a custom item that does not exist in the product catalog.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Product Name</Label>
            <Input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g. Custom service, one-off item"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Quantity</Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Unit Price (PKR)</Label>
              <Input
                type="number"
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Unit Cost (PKR)</Label>
              <Input
                type="number"
                step="0.01"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Discount (PKR)</Label>
              <Input
                type="number"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Payment Method</Label>
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
            <div className="flex flex-col gap-1.5">
              <Label>Amount Received (PKR)</Label>
              <Input
                type="number"
                step="0.01"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                placeholder={total.toFixed(2)}
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label>Notes (optional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
          </div>

          <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="font-display font-semibold text-accent">{formatCurrency(total)}</span>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="gold" disabled={saving}>
              {saving && <Loader2Icon className="animate-spin" />}
              Complete Sale
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
