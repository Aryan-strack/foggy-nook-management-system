"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { PlusIcon, PencilIcon, Trash2Icon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { fetchBrands, createBrand, updateBrand, deleteBrand } from "@/services/brands";
import type { Brand } from "@/types";
import { useAppStore } from "@/store/app-store";

export default function BrandsPage() {
  const profile = useAppStore((s) => s.profile);
  const canWrite = ["super_admin", "admin", "manager"].includes(profile?.role ?? "");

  const [brands, setBrands] = React.useState<Brand[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Brand | null>(null);
  const [name, setName] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Brand | null>(null);

  const load = React.useCallback(() => {
    setLoading(true);
    fetchBrands()
      .then(setBrands)
      .catch((e) => toast.error("Failed to load brands", { description: e.message }))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(load, [load]);

  function openCreate() {
    setEditing(null);
    setName("");
    setDialogOpen(true);
  }
  function openEdit(b: Brand) {
    setEditing(b);
    setName(b.name);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Brand name is required");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateBrand(editing.id, { name });
        toast.success("Brand updated");
      } else {
        await createBrand({ name });
        toast.success("Brand added");
      }
      setDialogOpen(false);
      load();
    } catch (e) {
      toast.error("Something went wrong", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteBrand(deleteTarget.id);
      toast.success("Brand deleted");
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast.error("Could not delete brand", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  }

  const columns: ColumnDef<Brand>[] = [
    { accessorKey: "name", header: "Brand" },
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
            cell: ({ row }: { row: { original: Brand } }) => (
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEdit(row.original)}>
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
          } as ColumnDef<Brand>,
        ]
      : []),
  ];

  return (
    <div>
      <PageHeader
        title="Brands"
        description="Manage the vape and smoke brands carried across all branches."
        action={
          canWrite && (
            <Button variant="gold" onClick={openCreate}>
              <PlusIcon /> Add Brand
            </Button>
          )
        }
      />

      {loading ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          <Loader2Icon className="mr-2 size-4 animate-spin" /> Loading…
        </div>
      ) : (
        <DataTable columns={columns} data={brands} searchPlaceholder="Search brands…" />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Brand" : "Add Brand"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="brand-name">Brand name</Label>
            <Input
              id="brand-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. SMOK"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="gold" onClick={handleSave} disabled={saving}>
              {saving && <Loader2Icon className="animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{deleteTarget?.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This can&apos;t be undone. Products using this brand will keep their brand
              reference removed.
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
