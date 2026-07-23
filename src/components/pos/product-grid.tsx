"use client";

import * as React from "react";
import { SearchIcon, ImageOffIcon, Package2Icon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BranchInventory } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/store/cart-store";
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner";
import { toast } from "sonner";

export function ProductGrid({ inventory }: { inventory: BranchInventory[] }) {
  const [query, setQuery] = React.useState("");
  const addItem = useCartStore((s) => s.addItem);

  const filtered = inventory.filter((row) => {
    if (!row.product) return false;
    const q = query.toLowerCase();
    return (
      row.product.name.toLowerCase().includes(q) ||
      row.product.barcode?.toLowerCase().includes(q) ||
      row.product.sku?.toLowerCase().includes(q)
    );
  });

  function handleAdd(row: BranchInventory, loose: boolean) {
    if (!row.product) return;
    if (loose && row.loose_stock <= 0) {
      toast.error("No loose stock available for this product");
      return;
    }
    if (!loose && row.stock <= 0) {
      toast.error("Out of stock");
      return;
    }
    addItem(row.product, loose ? "loose" : "unit", 1);
  }

  // USB barcode scanners "type" the code then Enter — this works instantly
  // anywhere on the page, no need to click into the search box first.
  useBarcodeScanner((code) => {
    const match = inventory.find(
      (row) => row.product?.barcode?.toLowerCase() === code.toLowerCase()
    );
    if (!match) {
      toast.error(`No product found for barcode "${code}"`);
      return;
    }
    handleAdd(match, false);
    toast.success(`${match.product?.name} added`);
  });

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="relative">
        <SearchIcon className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input
          autoFocus
          placeholder="Search by name, SKU, or scan barcode…"
          className="pl-8"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="grid flex-1 auto-rows-min grid-cols-2 gap-3 overflow-y-auto pb-2 sm:grid-cols-3 xl:grid-cols-4">
        {filtered.map((row) => {
          const p = row.product!;
          const outOfStock = row.stock <= 0;
          return (
            <Card
              key={row.id}
              className={`gap-2 py-3 transition-colors ${
                outOfStock ? "opacity-50" : "hover:border-accent cursor-pointer"
              }`}
              onClick={() => !outOfStock && handleAdd(row, false)}
            >
              <div className="flex flex-col gap-2 px-3">
                <div className="flex items-center justify-center rounded-md bg-secondary py-4">
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image_url} alt={p.name} className="h-12 object-contain" />
                  ) : (
                    <Package2Icon className="size-6 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="line-clamp-1 text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.brand?.name}</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-display text-sm font-semibold text-accent">
                    {formatCurrency(p.selling_price)}
                  </span>
                  <Badge variant={outOfStock ? "destructive" : "secondary"}>
                    {row.stock} pk
                  </Badge>
                </div>
                {p.is_loose_saleable && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAdd(row, true);
                    }}
                  >
                    + Loose ({formatCurrency(p.loose_selling_price ?? 0)}/pc, {row.loose_stock} left)
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full flex h-40 items-center justify-center text-sm text-muted-foreground">
            <ImageOffIcon className="mr-2 size-4" /> No products found
          </div>
        )}
      </div>
    </div>
  );
}
