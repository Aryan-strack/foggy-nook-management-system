"use client";

import * as React from "react";
import { Loader2Icon, UsbIcon, WifiIcon, BluetoothIcon, MonitorIcon } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { upsertBranchPrinter } from "@/services/printers";
import { requestUsbPrinter, isWebUsbSupported } from "@/lib/escpos/connections/usb";
import { requestBluetoothPrinter, isWebBluetoothSupported } from "@/lib/escpos/connections/bluetooth";
import { openCashDrawer } from "@/lib/escpos/print-service";
import type { Branch, BranchPrinter, PaperWidth, PrinterConnectionType } from "@/types";

const CONNECTION_OPTIONS: {
  value: PrinterConnectionType;
  label: string;
  icon: React.ElementType;
}[] = [
  { value: "browser", label: "Browser Print", icon: MonitorIcon },
  { value: "usb", label: "USB", icon: UsbIcon },
  { value: "network", label: "Network (LAN)", icon: WifiIcon },
  { value: "bluetooth", label: "Bluetooth", icon: BluetoothIcon },
];

export function BranchPrinterConfigDialog({
  open,
  onOpenChange,
  branch,
  printer,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  branch: Branch | null;
  printer: BranchPrinter | null;
  onSaved: () => void;
}) {
  const [saving, setSaving] = React.useState(false);
  const [pairing, setPairing] = React.useState(false);
  const [testing, setTesting] = React.useState(false);

  const [printerName, setPrinterName] = React.useState("");
  const [connectionType, setConnectionType] = React.useState<PrinterConnectionType>("browser");
  const [paperWidth, setPaperWidth] = React.useState<PaperWidth>("80mm");
  const [autoPrint, setAutoPrint] = React.useState(true);
  const [printPreview, setPrintPreview] = React.useState(true);
  const [openDrawer, setOpenDrawer] = React.useState(false);
  const [fontSize, setFontSize] = React.useState(0);
  const [leftMargin, setLeftMargin] = React.useState(0);
  const [footerMessage, setFooterMessage] = React.useState("");
  const [showQrCode, setShowQrCode] = React.useState(false);
  const [qrValue, setQrValue] = React.useState("");
  const [storeAddress, setStoreAddress] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [whatsapp, setWhatsapp] = React.useState("");
  const [networkIp, setNetworkIp] = React.useState("");
  const [networkPort, setNetworkPort] = React.useState("9100");
  const [usbVendorId, setUsbVendorId] = React.useState<number | null>(null);
  const [usbProductId, setUsbProductId] = React.useState<number | null>(null);
  const [btDeviceName, setBtDeviceName] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setPrinterName(printer?.printer_name ?? "");
    setConnectionType(printer?.connection_type ?? "browser");
    setPaperWidth(printer?.paper_width ?? "80mm");
    setAutoPrint(printer?.auto_print ?? true);
    setPrintPreview(printer?.print_preview ?? true);
    setOpenDrawer(printer?.open_cash_drawer ?? false);
    setFontSize(printer?.font_size ?? 0);
    setLeftMargin(printer?.left_margin ?? 0);
    setFooterMessage(printer?.footer_message ?? "");
    setShowQrCode(printer?.show_qr_code ?? false);
    setQrValue(printer?.qr_value ?? "");
    setStoreAddress(printer?.store_address ?? "");
    setPhone(printer?.phone ?? "");
    setWhatsapp(printer?.whatsapp ?? "");
    setNetworkIp(printer?.network_ip ?? "");
    setNetworkPort(String(printer?.network_port ?? 9100));
    setUsbVendorId(printer?.usb_vendor_id ?? null);
    setUsbProductId(printer?.usb_product_id ?? null);
    setBtDeviceName(printer?.bluetooth_device_name ?? null);
  }, [open, printer]);

  async function handlePairUsb() {
    setPairing(true);
    try {
      const { vendorId, productId } = await requestUsbPrinter();
      setUsbVendorId(vendorId);
      setUsbProductId(productId);
      toast.success("USB printer paired — remember to Save");
    } catch (e) {
      toast.error("Could not pair USB printer", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setPairing(false);
    }
  }

  async function handlePairBluetooth() {
    setPairing(true);
    try {
      const { name } = await requestBluetoothPrinter();
      setBtDeviceName(name);
      toast.success("Bluetooth printer selected — remember to Save");
    } catch (e) {
      toast.error("Could not pair Bluetooth printer", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setPairing(false);
    }
  }

  async function handleTestDrawer() {
    if (!printer) {
      toast.error("Save the printer configuration first");
      return;
    }
    setTesting(true);
    try {
      const result = await openCashDrawer(printer);
      if (result.status === "printed") {
        toast.success("Cash drawer signal sent");
      } else {
        toast.error(result.reason);
      }
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    if (!branch) return;
    setSaving(true);
    try {
      await upsertBranchPrinter(branch.id, {
        printer_name: printerName || null,
        connection_type: connectionType,
        paper_width: paperWidth,
        auto_print: autoPrint,
        print_preview: printPreview,
        open_cash_drawer: openDrawer,
        font_size: fontSize,
        left_margin: leftMargin,
        footer_message: footerMessage || null,
        show_qr_code: showQrCode,
        qr_value: qrValue || null,
        store_address: storeAddress || null,
        phone: phone || null,
        whatsapp: whatsapp || null,
        network_ip: networkIp || null,
        network_port: Number(networkPort) || 9100,
        usb_vendor_id: usbVendorId,
        usb_product_id: usbProductId,
        bluetooth_device_name: btDeviceName,
      });
      toast.success("Printer settings saved");
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error("Could not save printer settings", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Printer Settings — {branch?.name}</DialogTitle>
          <DialogDescription>
            Configure how receipts print for this branch. Managers at this branch will
            always use whatever is saved here.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="connection">
          <TabsList>
            <TabsTrigger value="connection">Connection</TabsTrigger>
            <TabsTrigger value="receipt">Receipt</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
          </TabsList>

          <TabsContent value="connection" className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Printer name (label)</Label>
              <Input
                value={printerName}
                onChange={(e) => setPrinterName(e.target.value)}
                placeholder="e.g. XPrinter XP-80C"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Connection type</Label>
              <div className="grid grid-cols-4 gap-2">
                {CONNECTION_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const active = connectionType === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setConnectionType(opt.value)}
                      className={`flex flex-col items-center gap-1 rounded-md border px-2 py-2.5 text-[11px] transition-colors ${
                        active ? "border-accent bg-accent/10 text-accent" : "hover:bg-secondary"
                      }`}
                    >
                      <Icon className="size-4" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {connectionType === "usb" && (
              <div className="flex flex-col gap-2 rounded-md border p-3">
                <p className="text-xs text-muted-foreground">
                  {isWebUsbSupported()
                    ? usbVendorId
                      ? `Paired: vendor 0x${usbVendorId.toString(16)}, product 0x${usbProductId?.toString(16)}`
                      : "Not paired yet — click below and pick the printer from the browser dialog."
                    : "WebUSB isn't supported in this browser. Use Chrome or Edge on desktop."}
                </p>
                <Button variant="outline" size="sm" onClick={handlePairUsb} disabled={pairing}>
                  {pairing && <Loader2Icon className="animate-spin" />}
                  Pair USB Printer
                </Button>
              </div>
            )}

            {connectionType === "network" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Printer IP address</Label>
                  <Input
                    value={networkIp}
                    onChange={(e) => setNetworkIp(e.target.value)}
                    placeholder="192.168.1.50"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Port</Label>
                  <Input
                    value={networkPort}
                    onChange={(e) => setNetworkPort(e.target.value)}
                    placeholder="9100"
                  />
                </div>
                <p className="col-span-2 text-[11px] text-muted-foreground">
                  The server running this app must be able to reach this IP (same LAN,
                  VPN, or port-forward). Most ESC/POS network printers listen on port
                  9100 by default.
                </p>
              </div>
            )}

            {connectionType === "bluetooth" && (
              <div className="flex flex-col gap-2 rounded-md border p-3">
                <p className="text-xs text-muted-foreground">
                  {isWebBluetoothSupported()
                    ? btDeviceName
                      ? `Selected: ${btDeviceName}`
                      : "Not selected yet. Only BLE-based printers work here — classic Bluetooth SPP printers must use Network or USB instead."
                    : "Web Bluetooth isn't supported in this browser. Use Chrome/Edge on desktop or Android."}
                </p>
                <Button variant="outline" size="sm" onClick={handlePairBluetooth} disabled={pairing}>
                  {pairing && <Loader2Icon className="animate-spin" />}
                  Select Bluetooth Printer
                </Button>
              </div>
            )}

            <div className="flex flex-col gap-3 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <Label className="font-normal">Auto print after sale</Label>
                <Switch checked={autoPrint} onCheckedChange={setAutoPrint} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="font-normal">Show print preview before printing</Label>
                <Switch checked={printPreview} onCheckedChange={setPrintPreview} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="font-normal">Open cash drawer after sale</Label>
                <Switch checked={openDrawer} onCheckedChange={setOpenDrawer} />
              </div>
              {connectionType !== "browser" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestDrawer}
                  disabled={testing}
                  className="self-start"
                >
                  {testing && <Loader2Icon className="animate-spin" />}
                  Test Cash Drawer
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="receipt" className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Paper width</Label>
              <Select value={paperWidth} onValueChange={(v) => setPaperWidth(v as PaperWidth)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="58mm">58mm</SelectItem>
                  <SelectItem value="80mm">80mm</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Font size</Label>
                <Select value={String(fontSize)} onValueChange={(v) => setFontSize(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Normal</SelectItem>
                    <SelectItem value="1">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Left margin (chars)</Label>
                <Input
                  type="number"
                  value={leftMargin}
                  onChange={(e) => setLeftMargin(Number(e.target.value) || 0)}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Footer message</Label>
              <Input
                value={footerMessage}
                onChange={(e) => setFooterMessage(e.target.value)}
                placeholder="e.g. No returns after 3 days without receipt"
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label className="font-normal">Show QR code on receipt</Label>
              <Switch checked={showQrCode} onCheckedChange={setShowQrCode} />
            </div>
            {showQrCode && (
              <div className="flex flex-col gap-1.5">
                <Label>QR code value (URL, WhatsApp link, etc.)</Label>
                <Input
                  value={qrValue}
                  onChange={(e) => setQrValue(e.target.value)}
                  placeholder="https://wa.me/92300xxxxxxx"
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="contact" className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Store address (overrides branch address on receipt)</Label>
              <Input value={storeAddress} onChange={(e) => setStoreAddress(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>WhatsApp</Label>
                <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
              </div>
            </div>
          </TabsContent>
        </Tabs>

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
