"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { createProduct, updateProduct } from "@/services/products";
import type { Brand, Category, Product } from "@/types";

const schema = z.object({
  name: z.string().min(2, "Product name is required"),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  brand_id: z.string().optional(),
  category_id: z.string().optional(),
  cost_price: z.coerce.number().min(0, "Must be 0 or more"),
  selling_price: z.coerce.number().min(0, "Must be 0 or more"),
  loose_selling_price: z.coerce.number().optional(),
  quantity_per_pack: z.coerce.number().min(1, "Must be at least 1"),
  minimum_stock: z.coerce.number().min(0, "Must be 0 or more"),
  is_loose_saleable: z.boolean(),
  image_url: z.string().optional(),
});

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  brands,
  categories,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  brands: Brand[];
  categories: Category[];
  onSaved: () => void;
}) {
  const [saving, setSaving] = React.useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      sku: "",
      barcode: "",
      cost_price: 0,
      selling_price: 0,
      quantity_per_pack: 1,
      minimum_stock: 5,
      is_loose_saleable: false,
    },
  });

  const isLooseSaleable = watch("is_loose_saleable");

  React.useEffect(() => {
    if (open) {
      reset(
        product
          ? {
              name: product.name,
              sku: product.sku ?? "",
              barcode: product.barcode ?? "",
              brand_id: product.brand_id ?? undefined,
              category_id: product.category_id ?? undefined,
              cost_price: product.cost_price,
              selling_price: product.selling_price,
              loose_selling_price: product.loose_selling_price ?? undefined,
              quantity_per_pack: product.quantity_per_pack,
              minimum_stock: product.minimum_stock,
              is_loose_saleable: product.is_loose_saleable,
              image_url: product.image_url ?? "",
            }
          : {
              name: "",
              sku: "",
              barcode: "",
              cost_price: 0,
              selling_price: 0,
              quantity_per_pack: 1,
              minimum_stock: 5,
              is_loose_saleable: false,
            }
      );
    }
  }, [open, product, reset]);

  async function onSubmit(values: FormValues) {
    setSaving(true);
    try {
      const payload = {
        ...values,
        sku: values.sku || null,
        barcode: values.barcode || null,
        brand_id: values.brand_id || null,
        category_id: values.category_id || null,
        loose_selling_price: values.is_loose_saleable
          ? values.loose_selling_price ?? null
          : null,
        image_url: values.image_url || null,
      };
      if (product) {
        await updateProduct(product.id, payload);
        toast.success("Product updated");
      } else {
        await createProduct(payload);
        toast.success("Product added");
      }
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error("Something went wrong", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{product ? "Edit Product" : "Add Product"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>Product name</Label>
              <Input {...register("name")} placeholder="e.g. OXVA Xlim Pro" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>SKU</Label>
              <Input {...register("sku")} placeholder="Optional" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Barcode</Label>
              <Input {...register("barcode")} placeholder="Optional" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Brand</Label>
              <Controller
                control={control}
                name="brand_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Category</Label>
              <Controller
                control={control}
                name="category_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Cost price (PKR)</Label>
              <Input type="number" step="0.01" {...register("cost_price")} />
              {errors.cost_price && (
                <p className="text-xs text-destructive">{errors.cost_price.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Selling price (PKR)</Label>
              <Input type="number" step="0.01" {...register("selling_price")} />
              {errors.selling_price && (
                <p className="text-xs text-destructive">{errors.selling_price.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Quantity per pack</Label>
              <Input type="number" {...register("quantity_per_pack")} />
              <p className="text-[11px] text-muted-foreground">
                e.g. 20 for a pack of cigarettes
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Minimum stock</Label>
              <Input type="number" {...register("minimum_stock")} />
            </div>

            <div className="flex items-center justify-between rounded-md border px-3 py-2.5 sm:col-span-2">
              <div>
                <Label>Enable loose / manual selling</Label>
                <p className="text-[11px] text-muted-foreground">
                  Allows selling individual pieces from a pack (e.g. single cigarettes) in
                  POS.
                </p>
              </div>
              <Controller
                control={control}
                name="is_loose_saleable"
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
            </div>

            {isLooseSaleable && (
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label>Loose / per-piece selling price (PKR)</Label>
                <Input type="number" step="0.01" {...register("loose_selling_price")} />
              </div>
            )}

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>Image URL (optional)</Label>
              <Input {...register("image_url")} placeholder="https://…" />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="gold" disabled={saving}>
              {saving && <Loader2Icon className="animate-spin" />}
              Save Product
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
