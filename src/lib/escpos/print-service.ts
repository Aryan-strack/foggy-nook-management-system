import { buildReceiptEscPos, escPosOptionsFromPrinter } from "./receipt-builder";
import { printViaUsb, isWebUsbSupported } from "./connections/usb";
import { printViaBluetooth, isWebBluetoothSupported } from "./connections/bluetooth";
import { printViaNetwork } from "./connections/network";
import type { BranchPrinter, ReceiptData } from "@/types";

export type PrintResult =
  | { status: "printed"; via: string }
  | { status: "fallback_to_browser"; reason: string };

/**
 * Attempts direct ESC/POS printing via the branch's configured connection.
 * Returns `fallback_to_browser` (rather than throwing) whenever direct
 * printing isn't possible, so callers can transparently open the browser
 * print dialog instead — the POS should never block a cashier because a
 * printer integration hiccuped.
 */
export async function printReceiptEscPos(
  data: ReceiptData,
  printer: BranchPrinter | null
): Promise<PrintResult> {
  if (!printer || printer.connection_type === "browser") {
    return { status: "fallback_to_browser", reason: "No direct printer configured for this branch." };
  }

  const options = escPosOptionsFromPrinter(printer);
  const bytes = buildReceiptEscPos(data, options);

  try {
    switch (printer.connection_type) {
      case "usb": {
        if (!isWebUsbSupported()) {
          return {
            status: "fallback_to_browser",
            reason: "WebUSB isn't supported in this browser.",
          };
        }
        if (!printer.usb_vendor_id || !printer.usb_product_id) {
          return {
            status: "fallback_to_browser",
            reason: "USB printer isn't paired yet — pair it in Printer Settings.",
          };
        }
        await printViaUsb(printer.usb_vendor_id, printer.usb_product_id, bytes);
        return { status: "printed", via: "usb" };
      }
      case "network": {
        if (!printer.network_ip) {
          return {
            status: "fallback_to_browser",
            reason: "No network IP configured for this branch's printer.",
          };
        }
        await printViaNetwork(printer.network_ip, printer.network_port ?? 9100, bytes);
        return { status: "printed", via: "network" };
      }
      case "bluetooth": {
        if (!isWebBluetoothSupported()) {
          return {
            status: "fallback_to_browser",
            reason: "Web Bluetooth isn't supported in this browser.",
          };
        }
        await printViaBluetooth(bytes);
        return { status: "printed", via: "bluetooth" };
      }
      default:
        return { status: "fallback_to_browser", reason: "Unknown connection type." };
    }
  } catch (err) {
    return {
      status: "fallback_to_browser",
      reason: err instanceof Error ? err.message : "Direct printing failed.",
    };
  }
}

/** Fire-and-forget cash drawer kick using the same connection as printing. */
export async function openCashDrawer(printer: BranchPrinter | null): Promise<PrintResult> {
  if (!printer || printer.connection_type === "browser") {
    return {
      status: "fallback_to_browser",
      reason: "Cash drawer kick requires a direct (USB/Network/Bluetooth) printer connection.",
    };
  }

  const { EscPosBuilder } = await import("./commands");
  const bytes = new EscPosBuilder().init().openCashDrawer().build();

  try {
    switch (printer.connection_type) {
      case "usb":
        if (!printer.usb_vendor_id || !printer.usb_product_id) {
          return { status: "fallback_to_browser", reason: "USB printer not paired." };
        }
        await printViaUsb(printer.usb_vendor_id, printer.usb_product_id, bytes);
        return { status: "printed", via: "usb" };
      case "network":
        if (!printer.network_ip) {
          return { status: "fallback_to_browser", reason: "No network IP configured." };
        }
        await printViaNetwork(printer.network_ip, printer.network_port ?? 9100, bytes);
        return { status: "printed", via: "network" };
      case "bluetooth":
        await printViaBluetooth(bytes);
        return { status: "printed", via: "bluetooth" };
      default:
        return { status: "fallback_to_browser", reason: "Unknown connection type." };
    }
  } catch (err) {
    return {
      status: "fallback_to_browser",
      reason: err instanceof Error ? err.message : "Could not open the cash drawer.",
    };
  }
}
