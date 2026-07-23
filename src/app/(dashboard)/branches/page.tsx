"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { PlusIcon, PencilIcon, Loader2Icon, ShieldAlertIcon } from "lucide-react";
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
import { fetchBranches, createBranch, updateBranch } from "@/services/branches";
import type { Branch } from "@/types";
import { useAppStore } from "@/store/app-store";

export default function BranchesPage() {
  const profile = useAppStore((s) => s.profile);
  const setBranches = useAppStore((s) => s.setBranches);
  const [branches, setLocalBranches] = React.useState<Branch[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Branch | null>(null);
  const [saving, setSaving] = React.useState(false);

  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [city, setCity] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [phone, setPhone] = React.useState("");

  const load = React.useCallback(() => {
    setLoading(true);
    fetchBranches()
      .then((b) => {
        setLocalBranches(b);
        setBranches(b);
      })
      .catch((e) => toast.error("Failed to load branches", { description: e.message }))
      .finally(() => setLoading(false));
  }, [setBranches]);

  React.useEffect(load, [load]);

  if (profile && profile.role !== "super_admin") {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
        <ShieldAlertIcon className="size-8" />
        <p>Only the Super Admin can manage branches.</p>
      </div>
    );
  }

  function openCreate() {
    setEditing(null);
    setName("");
    setCode("");
    setCity("");
    setAddress("");
    setPhone("");
    setDialogOpen(true);
  }
  function openEdit(b: Branch) {
    setEditing(b);
    setName(b.name);
    setCode(b.code ?? "");
    setCity(b.city ?? "");
    setAddress(b.address ?? "");
    setPhone(b.phone ?? "");
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Branch name is required");
      return;
    }
    setSaving(true);
    try {
      const payload = { name, code: code || null, city: city || null, address: address || null, phone: phone || null };
      if (editing) {
        await updateBranch(editing.id, payload);
        toast.success("Branch updated");
      } else {
        await createBranch(payload);
        toast.success("Branch created");
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

  const columns: ColumnDef<Branch>[] = [
    { accessorKey: "name", header: "Branch" },
    { accessorKey: "code", header: "Code" },
    { accessorKey: "city", header: "City" },
    { accessorKey: "phone", header: "Phone" },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? "success" : "secondary"}>
          {row.original.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button variant="ghost" size="icon" onClick={() => openEdit(row.original)}>
          <PencilIcon className="size-4" />
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Branches"
        description="Manage every Foggy Nook location."
        action={
          <Button variant="gold" onClick={openCreate}>
            <PlusIcon /> Add Branch
          </Button>
        }
      />

      {loading ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          <Loader2Icon className="mr-2 size-4 animate-spin" /> Loading…
        </div>
      ) : (
        <DataTable columns={columns} data={branches} searchPlaceholder="Search branches…" />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Branch" : "Add Branch"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Branch name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Foggy Nook - Vehari" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Code</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="VHR" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>City</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Address</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
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
    </div>
  );
}
