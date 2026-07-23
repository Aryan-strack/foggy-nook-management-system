/**
 * Web Bluetooth transport for ESC/POS thermal printers.
 *
 * Important caveat: most cheap "Bluetooth thermal printers" sold in
 * Pakistan use classic Bluetooth SPP (Serial Port Profile), which browsers
 * cannot access — Web Bluetooth only supports Bluetooth Low Energy (BLE)
 * GATT services. This transport works with printers that expose a BLE GATT
 * write characteristic (common on newer portable/label printers). If your
 * printer only does classic SPP, use the Network (LAN) or USB connection
 * type instead, or print via the phone/Windows native print driver.
 *
 * The service/characteristic UUIDs below are the ones most widely reused
 * across generic BLE thermal printer firmware; they're configurable per
 * printer via `bluetooth_service_uuid` if a specific model needs different
 * ones (extend branch_printers if you hit a model that differs).
 */

const DEFAULT_SERVICE_UUID = "000018f0-0000-1000-8000-00805f9b34fb";
const DEFAULT_WRITE_CHARACTERISTIC_UUID = "00002af1-0000-1000-8000-00805f9b34fb";

// BLE write payloads are limited by the negotiated MTU — chunk conservatively.
const BLE_CHUNK_SIZE = 180;

export function isWebBluetoothSupported() {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

export async function requestBluetoothPrinter(): Promise<{
  id: string;
  name: string | null;
}> {
  if (!isWebBluetoothSupported()) {
    throw new Error(
      "Web Bluetooth is not supported in this browser (use Chrome/Edge on desktop or Android)."
    );
  }
  const device = await navigator.bluetooth.requestDevice({
    filters: [{ services: [DEFAULT_SERVICE_UUID] }],
    optionalServices: [DEFAULT_SERVICE_UUID],
  });
  return { id: device.id, name: device.name ?? null };
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function printViaBluetooth(bytes: Uint8Array): Promise<void> {
  if (!isWebBluetoothSupported()) {
    throw new Error("Web Bluetooth is not supported in this browser.");
  }

  // requestDevice() must be re-invoked here (browsers don't allow silently
  // reconnecting to a previously chosen device without a fresh user gesture
  // in most flows) — the caller wires this to a "Print" button click.
  const device = await navigator.bluetooth.requestDevice({
    filters: [{ services: [DEFAULT_SERVICE_UUID] }],
    optionalServices: [DEFAULT_SERVICE_UUID],
  });

  const server = await device.gatt?.connect();
  if (!server) throw new Error("Could not connect to the Bluetooth printer's GATT server.");

  try {
    const service = await server.getPrimaryService(DEFAULT_SERVICE_UUID);
    const characteristic = await service.getCharacteristic(
      DEFAULT_WRITE_CHARACTERISTIC_UUID
    );

    for (let offset = 0; offset < bytes.length; offset += BLE_CHUNK_SIZE) {
      const chunk = bytes.slice(offset, offset + BLE_CHUNK_SIZE);
      await characteristic.writeValueWithoutResponse(chunk);
      // Small delay between chunks — cheap BLE printer firmware often drops
      // bytes if flooded back-to-back.
      await sleep(20);
    }
  } finally {
    server.disconnect();
  }
}
