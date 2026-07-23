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
import { adjustStock } from "@/services/inventory";
import type { BranchInventory, InventoryMovementType } from "@/types";
import { useAppStore } from "@/store/app-store";

const MOVEMENT_OPTIONS: { value: InventoryMovementType; label: string; sign: 1 | -1 }[] = [
  { value: "stock_in", label: "Stock In", sign: 1 },
  { value: "stock_out", label: "Stock Out", sign: -1 },
  { value: "adjustment", label: "Manual Adjustment (+/-)", sign: 1 },
  { value: "damaged", label: "Damaged", sign: -1 },
  { value: "expired", label: "Expired", sign: -1 },
  { value: "returned", label: "Returned (customer)", sign: 1 },
];

export function StockAdjustDialog({
  open,
  onOpenChange,
  row,
  branchId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  row: BranchInventory | null;
  branchId: string;
  onSaved: () => void;
}) {
  const profile = useAppStore((s) => s.profile);
  const [movementType, setMovementType] = React.useState<InventoryMovementType>("stock_in");
  const [quantity, setQuantity] = React.useState("0");
  const [reason, setReason] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setMovementType("stock_in");
      setQuantity("0");
      setReason("");
    }
  }, [open]);

  async function handleSave() {
    if (!row || !profile) return;
    const qty = Number(quantity);
    if (!qty) {
      toast.error("Enter a non-zero quantity");
      return;
    }

    const option = MOVEMENT_OPTIONS.find((o) => o.value === movementType)!;
    const signedQty = movementType === "adjustment" ? qty : Math.abs(qty) * option.sign;

    setSaving(true);
    try {
      await adjustStock({
        branchId,
        productId: row.product_id,
        movementType,
        quantity: signedQty,
        reason,
        performedBy: profile.id,
      });
      toast.success("Stock updated");
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error("Could not update stock", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust Stock — {row?.product?.name}</DialogTitle>
          <DialogDescription>
            Current stock: {row?.stock ?? 0} pack(s)
            {row?.product?.is_loose_saleable ? ` · ${row?.loose_stock ?? 0} loose pc(s)` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Movement type</Label>
            <Select value={movementType} onValueChange={(v) => setMovementType(v as InventoryMovementType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MOVEMENT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>
              Quantity {movementType === "adjustment" ? "(use negative to reduce)" : ""}
            </Label>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Reason / note (optional)</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="gold" onClick={handleSave} disabled={saving}>
            {saving && <Loader2Icon className="animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
