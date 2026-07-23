/**
 * WebUSB transport for ESC/POS thermal printers.
 *
 * Browser support: Chrome / Edge / Opera (desktop) only, and only over
 * HTTPS or http://localhost — this is a browser platform restriction, not
 * something the app can work around. Safari and Firefox do not implement
 * the WebUSB spec.
 */

const PRINTER_CLASS_CODE = 0x07; // USB Printer Class

export interface UsbPrinterHandle {
  device: USBDevice;
  interfaceNumber: number;
  outEndpoint: number;
}

export function isWebUsbSupported() {
  return typeof navigator !== "undefined" && "usb" in navigator;
}

/** Opens the browser's native device picker filtered to printer-class USB devices. */
export async function requestUsbPrinter(): Promise<{
  vendorId: number;
  productId: number;
}> {
  if (!isWebUsbSupported()) {
    throw new Error("WebUSB is not supported in this browser (use Chrome/Edge on desktop).");
  }
  const device = await navigator.usb.requestDevice({
    filters: [{ classCode: PRINTER_CLASS_CODE }],
  });
  return { vendorId: device.vendorId, productId: device.productId };
}

async function findPreviouslyPairedDevice(
  vendorId: number,
  productId: number
): Promise<USBDevice | null> {
  const devices = await navigator.usb.getDevices();
  return (
    devices.find((d) => d.vendorId === vendorId && d.productId === productId) ?? null
  );
}

async function openPrinter(vendorId: number, productId: number): Promise<UsbPrinterHandle> {
  const device = await findPreviouslyPairedDevice(vendorId, productId);
  if (!device) {
    throw new Error(
      "Printer not paired yet in this browser. Go to Printer Settings and click 'Pair USB Printer' once."
    );
  }

  await device.open();
  if (device.configuration === null) {
    await device.selectConfiguration(1);
  }

  const iface = device.configuration!.interfaces.find((i) =>
    i.alternates.some((alt) => alt.interfaceClass === PRINTER_CLASS_CODE)
  );
  if (!iface) {
    throw new Error("No printer-class interface found on this USB device.");
  }

  await device.claimInterface(iface.interfaceNumber);

  const alternate = iface.alternates.find(
    (alt) => alt.interfaceClass === PRINTER_CLASS_CODE
  )!;
  const outEndpoint = alternate.endpoints.find((e) => e.direction === "out");
  if (!outEndpoint) {
    throw new Error("No OUT endpoint found on this printer's USB interface.");
  }

  return { device, interfaceNumber: iface.interfaceNumber, outEndpoint: outEndpoint.endpointNumber };
}

export async function printViaUsb(
  vendorId: number,
  productId: number,
  bytes: Uint8Array
): Promise<void> {
  const handle = await openPrinter(vendorId, productId);
  try {
    // Chunk large payloads — some USB printer controllers choke on very
    // large single transfers.
    const CHUNK = 4096;
    for (let offset = 0; offset < bytes.length; offset += CHUNK) {
      const slice = bytes.slice(offset, offset + CHUNK);
      await handle.device.transferOut(handle.outEndpoint, slice);
    }
  } finally {
    await handle.device.close();
  }
}
