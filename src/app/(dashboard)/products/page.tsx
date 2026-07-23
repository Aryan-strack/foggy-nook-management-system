"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { PlusIcon, PencilIcon, Trash2Icon, Loader2Icon, ImageOffIcon } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { ProductFormDialog } from "@/components/products/product-form-dialog";
import { fetchProducts, deleteProduct } from "@/services/products";
import { fetchBrands } from "@/services/brands";
import { fetchCategories } from "@/services/categories";
import type { Brand, Category, Product } from "@/types";
import { useAppStore } from "@/store/app-store";
import { formatCurrency } from "@/lib/utils";

export default function ProductsPage() {
  const profile = useAppStore((s) => s.profile);
  const canWrite = ["super_admin", "admin", "manager"].includes(profile?.role ?? "");

  const [products, setProducts] = React.useState<Product[]>([]);
  const [brands, setBrands] = React.useState<Brand[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Product | null>(null);

  const load = React.useCallback(() => {
    setLoading(true);
    Promise.all([fetchProducts(), fetchBrands(), fetchCategories()])
      .then(([p, b, c]) => {
        setProducts(p);
        setBrands(b);
        setCategories(c);
      })
      .catch((e) => toast.error("Failed to load products", { description: e.message }))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(load, [load]);

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteProduct(deleteTarget.id);
      toast.success("Product deleted");
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast.error("Could not delete product", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  }

  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: "name",
      header: "Product",
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5">
          {row.original.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.original.image_url}
              alt={row.original.name}
              className="size-8 rounded object-cover"
            />
          ) : (
            <div className="flex size-8 items-center justify-center rounded bg-secondary">
              <ImageOffIcon className="size-4 text-muted-foreground" />
            </div>
          )}
          <div className="flex flex-col">
            <span className="font-medium">{row.original.name}</span>
            <span className="text-xs text-muted-foreground">
              {row.original.sku ?? "No SKU"}
            </span>
          </div>
        </div>
      ),
    },
    {
      id: "brand",
      header: "Brand",
      accessorFn: (row) => row.brand?.name ?? "—",
    },
    {
      id: "category",
      header: "Category",
      accessorFn: (row) => row.category?.name ?? "—",
    },
    {
      accessorKey: "cost_price",
      header: "Cost",
      cell: ({ row }) => formatCurrency(row.original.cost_price),
    },
    {
      accessorKey: "selling_price",
      header: "Selling",
      cell: ({ row }) => formatCurrency(row.original.selling_price),
    },
    {
      id: "loose",
      header: "Loose Sale",
      cell: ({ row }) =>
        row.original.is_loose_saleable ? (
          <Badge variant="gold">
            {formatCurrency(row.original.loose_selling_price ?? 0)}/pc
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? "success" : "secondary"}>
          {row.original.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    ...(canWrite
      ? [
          {
            id: "actions",
            header: "",
            cell: ({ row }: { row: { original: Product } }) => (
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setEditing(row.original);
                    setDialogOpen(true);
                  }}
                >
                  <PencilIcon className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteTarget(row.original)}
                >
                  <Trash2Icon className="size-4 text-destructive" />
                </Button>
              </div>
            ),
          } as ColumnDef<Product>,
        ]
      : []),
  ];

  return (
    <div>
      <PageHeader
        title="Products"
        description="Global product catalog, shared across every branch."
        action={
          canWrite && (
            <Button
              variant="gold"
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <PlusIcon /> Add Product
            </Button>
          )
        }
      />

      {loading ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          <Loader2Icon className="mr-2 size-4 animate-spin" /> Loading…
        </div>
      ) : (
        <DataTable columns={columns} data={products} searchPlaceholder="Search products…" />
      )}

      <ProductFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={editing}
        brands={brands}
        categories={categories}
        onSaved={load}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{deleteTarget?.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the product from the global catalog and all branch inventories.
              This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
