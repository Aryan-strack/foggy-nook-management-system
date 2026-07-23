"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { PlusIcon, Loader2Icon, ShieldAlertIcon } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { fetchManagers } from "@/services/profiles";
import { fetchBranches } from "@/services/branches";
import type { Branch, Profile } from "@/types";
import { useAppStore } from "@/store/app-store";

export default function ManagersPage() {
  const profile = useAppStore((s) => s.profile);
  const [managers, setManagers] = React.useState<Profile[]>([]);
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [branchId, setBranchId] = React.useState("");

  const load = React.useCallback(() => {
    setLoading(true);
    Promise.all([fetchManagers(), fetchBranches()])
      .then(([m, b]) => {
        setManagers(m);
        setBranches(b);
      })
      .catch((e) => toast.error("Failed to load managers", { description: e.message }))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(load, [load]);

  if (profile && profile.role === "manager") {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
        <ShieldAlertIcon className="size-8" />
        <p>Only Admins and Super Admins can manage user accounts.</p>
      </div>
    );
  }

  function openCreate() {
    setFullName("");
    setEmail("");
    setPassword("");
    setBranchId("");
    setDialogOpen(true);
  }

  async function handleCreate() {
    if (!fullName.trim() || !email.trim() || password.length < 6 || !branchId) {
      toast.error("Fill all fields — password must be at least 6 characters");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/managers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName, email, password, branch_id: branchId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create manager");
      toast.success("Manager account created");
      setDialogOpen(false);
      load();
    } catch (e) {
      toast.error("Could not create manager", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  const columns: ColumnDef<Profile>[] = [
    { accessorKey: "full_name", header: "Name" },
    { accessorKey: "email", header: "Email" },
    {
      id: "branch",
      header: "Branch",
      accessorFn: (r) => r.branch?.name ?? "Unassigned",
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
  ];

  return (
    <div>
      <PageHeader
        title="Managers"
        description="Branch managers and their assignments."
        action={
          <Button variant="gold" onClick={openCreate}>
            <PlusIcon /> Add Manager
          </Button>
        }
      />

      {loading ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          <Loader2Icon className="mr-2 size-4 animate-spin" /> Loading…
        </div>
      ) : (
        <DataTable columns={columns} data={managers} searchPlaceholder="Search managers…" />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Manager</DialogTitle>
            <DialogDescription>
              Creates a login for this person and assigns them to a single branch.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Full name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Temporary password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Branch</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Assign a branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="gold" onClick={handleCreate} disabled={saving}>
              {saving && <Loader2Icon className="animate-spin" />}
              Create Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
