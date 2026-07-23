"use client";

import * as React from "react";
import { Loader2Icon, ShieldAlertIcon, SettingsIcon } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BranchPrinterConfigDialog } from "@/components/settings/branch-printer-config-dialog";
import { fetchBranches } from "@/services/branches";
import { fetchBranchPrinters } from "@/services/printers";
import type { Branch, BranchPrinter } from "@/types";
import { useAppStore } from "@/store/app-store";

const CONNECTION_LABEL: Record<string, string> = {
  browser: "Browser Print",
  usb: "USB",
  network: "Network (LAN)",
  bluetooth: "Bluetooth",
};

export default function PrinterSettingsPage() {
  const profile = useAppStore((s) => s.profile);
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [printers, setPrinters] = React.useState<BranchPrinter[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editingBranch, setEditingBranch] = React.useState<Branch | null>(null);

  const load = React.useCallback(() => {
    setLoading(true);
    Promise.all([fetchBranches(), fetchBranchPrinters()])
      .then(([b, p]) => {
        setBranches(b);
        setPrinters(p);
      })
      .catch((e) => toast.error("Failed to load printer settings", { description: e.message }))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(load, [load]);

  if (profile && profile.role === "manager") {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
        <ShieldAlertIcon className="size-8" />
        <p>Only Admins and the Super Admin can configure printers.</p>
      </div>
    );
  }

  const printerByBranch = new Map(printers.map((p) => [p.branch_id, p]));

  return (
    <div>
      <PageHeader
        title="Printer Settings"
        description="Each branch has its own receipt printer configuration — 58mm/80mm, USB/Network/Bluetooth, and receipt options."
      />

      {loading ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          <Loader2Icon className="mr-2 size-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map((branch) => {
            const printer = printerByBranch.get(branch.id);
            return (
              <Card key={branch.id}>
                <CardContent className="flex flex-col gap-3 py-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-display font-semibold">{branch.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {printer?.printer_name || "No printer configured"}
                      </p>
                    </div>
                    <Badge variant="gold">
                      {CONNECTION_LABEL[printer?.connection_type ?? "browser"]}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                    <Badge variant="secondary">{printer?.paper_width ?? "80mm"}</Badge>
                    {printer?.auto_print && <Badge variant="secondary">Auto print</Badge>}
                    {printer?.open_cash_drawer && <Badge variant="secondary">Cash drawer</Badge>}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="self-start"
                    onClick={() => setEditingBranch(branch)}
                  >
                    <SettingsIcon /> Configure
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <BranchPrinterConfigDialog
        open={!!editingBranch}
        onOpenChange={(o) => !o && setEditingBranch(null)}
        branch={editingBranch}
        printer={editingBranch ? printerByBranch.get(editingBranch.id) ?? null : null}
        onSaved={load}
      />
    </div>
  );
}
