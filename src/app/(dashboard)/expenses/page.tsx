"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { PlusIcon, Loader2Icon } from "lucide-react";
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
} from "@/components/ui/dialog";
import { fetchExpenses, fetchExpenseCategories, createExpense } from "@/services/expenses";
import type { Expense, ExpenseCategory } from "@/types";
import { useAppStore } from "@/store/app-store";
import { formatCurrency } from "@/lib/utils";

export default function ExpensesPage() {
  const profile = useAppStore((s) => s.profile);
  const activeBranchId = useAppStore((s) => s.activeBranchId);
  const branchId = profile?.role === "manager" ? profile.branch_id : activeBranchId;

  const [expenses, setExpenses] = React.useState<Expense[]>([]);
  const [categories, setCategories] = React.useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const [title, setTitle] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [categoryId, setCategoryId] = React.useState<string>("");
  const [date, setDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = React.useState("");

  const load = React.useCallback(() => {
    if (!profile) return;
    setLoading(true);
    Promise.all([fetchExpenses(branchId), fetchExpenseCategories()])
      .then(([e, c]) => {
        setExpenses(e);
        setCategories(c);
      })
      .catch((e) => toast.error("Failed to load expenses", { description: e.message }))
      .finally(() => setLoading(false));
  }, [profile, branchId]);

  React.useEffect(load, [load]);

  function openCreate() {
    setTitle("");
    setAmount("");
    setCategoryId("");
    setDate(new Date().toISOString().slice(0, 10));
    setDescription("");
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!title.trim() || !amount || Number(amount) <= 0) {
      toast.error("Enter a title and a valid amount");
      return;
    }
    const targetBranch = profile?.role === "manager" ? profile.branch_id : activeBranchId;
    if (!targetBranch) {
      toast.error("Select a branch first");
      return;
    }
    setSaving(true);
    try {
      await createExpense({
        branch_id: targetBranch,
        category_id: categoryId || null,
        title,
        amount: Number(amount),
        expense_date: date,
        description: description || null,
        created_by: profile?.id,
      });
      toast.success("Expense recorded");
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

  const columns: ColumnDef<Expense>[] = [
    { accessorKey: "title", header: "Title" },
    {
      id: "category",
      header: "Category",
      accessorFn: (r) => r.category?.name ?? "—",
      cell: ({ row }) => <Badge variant="secondary">{row.original.category?.name ?? "—"}</Badge>,
    },
    ...(!branchId
      ? [
          {
            id: "branch",
            header: "Branch",
            accessorFn: (r: Expense) => r.branch?.name ?? "",
          } as ColumnDef<Expense>,
        ]
      : []),
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => formatCurrency(row.original.amount),
    },
    { accessorKey: "expense_date", header: "Date" },
  ];

  return (
    <div>
      <PageHeader
        title="Expenses"
        description="Track rent, salaries, utilities, and other operating costs."
        action={
          <Button variant="gold" onClick={openCreate}>
            <PlusIcon /> Add Expense
          </Button>
        }
      />

      {loading ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          <Loader2Icon className="mr-2 size-4 animate-spin" /> Loading…
        </div>
      ) : (
        <DataTable columns={columns} data={expenses} searchPlaceholder="Search expenses…" />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Shop rent — July" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Amount (PKR)</Label>
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
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
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Description (optional)</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
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
