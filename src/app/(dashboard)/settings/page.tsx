"use client";

import * as React from "react";
import { Loader2Icon, ShieldAlertIcon, SaveIcon } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { fetchSettings, updateSettings } from "@/services/settings";
import type { Settings } from "@/types";
import { useAppStore } from "@/store/app-store";

export default function SettingsPage() {
  const profile = useAppStore((s) => s.profile);
  const [settings, setSettings] = React.useState<Settings | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    fetchSettings()
      .then(setSettings)
      .catch((e) => toast.error("Failed to load settings", { description: e.message }))
      .finally(() => setLoading(false));
  }, []);

  if (profile && profile.role === "manager") {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
        <ShieldAlertIcon className="size-8" />
        <p>Only Admins and the Super Admin can change shop settings.</p>
      </div>
    );
  }

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await updateSettings(settings);
      setSettings(updated);
      toast.success("Settings saved");
    } catch (e) {
      toast.error("Could not save settings", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading || !settings) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        <Loader2Icon className="mr-2 size-4 animate-spin" /> Loading…
      </div>
    );
  }

  function field<K extends keyof Settings>(key: K) {
    return {
      value: (settings![key] ?? "") as string,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setSettings({ ...settings!, [key]: e.target.value }),
    };
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Shop-wide configuration used across receipts and dashboards."
        action={
          <Button variant="gold" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
            Save Changes
          </Button>
        }
      />

      <Card className="max-w-2xl">
        <CardContent className="grid gap-4 py-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Shop name</Label>
            <Input {...field("shop_name")} />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Logo URL</Label>
            <Input {...field("logo_url")} placeholder="https://…" />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Address</Label>
            <Input {...field("address")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Phone</Label>
            <Input {...field("phone")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>WhatsApp</Label>
            <Input {...field("whatsapp")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Tax (%)</Label>
            <Input
              type="number"
              value={settings.tax_percent}
              onChange={(e) =>
                setSettings({ ...settings, tax_percent: Number(e.target.value) || 0 })
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Currency</Label>
            <Input {...field("currency")} />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Receipt footer</Label>
            <Input {...field("receipt_footer")} placeholder="Thank you for shopping with us!" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Daily sales target (PKR)</Label>
            <Input
              type="number"
              value={settings.daily_target ?? ""}
              onChange={(e) =>
                setSettings({ ...settings, daily_target: Number(e.target.value) || null })
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Monthly sales target (PKR)</Label>
            <Input
              type="number"
              value={settings.monthly_target ?? ""}
              onChange={(e) =>
                setSettings({ ...settings, monthly_target: Number(e.target.value) || null })
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
