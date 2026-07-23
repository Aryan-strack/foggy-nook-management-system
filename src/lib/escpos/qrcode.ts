/**
 * Native ESC/POS QR code printing via the `GS ( k` command family.
 *
 * This tells the printer's own firmware to render and print a QR code —
 * no image rasterization needed on our side. Supported by essentially every
 * ESC/POS-compatible printer sold since ~2015 (XPrinter, Epson TM series,
 * GoojPrt, Rongta, etc).
 *
 * For the on-screen preview / PDF download we instead render a real QR
 * image client-side via the `qrcode` npm package — see
 * `src/components/receipt/receipt-footer.tsx`.
 */

const GS = 0x1d;

function qrCommand(pL: number, pH: number, cn: number, fn: number, extra: number[] = []) {
  return [GS, 0x28, 0x6b, pL, pH, cn, fn, ...extra];
}

/**
 * Builds the full byte sequence to print a QR code for `value`.
 * moduleSize: dot size in printer units, 3–8 is a sensible thermal-receipt range.
 * errorCorrection: 48=L(7%) 49=M(15%) 50=Q(25%) 51=H(30%)
 */
export function buildQrCodeBytes(
  value: string,
  moduleSize = 5,
  errorCorrection: 48 | 49 | 50 | 51 = 49
): number[] {
  const data = new TextEncoder().encode(value);
  const bytes: number[] = [];

  // Select model 2 (fn=65, cn=49)
  bytes.push(...qrCommand(4, 0, 49, 65, [50, 0]));

  // Set module (dot) size (fn=67, cn=49)
  bytes.push(...qrCommand(3, 0, 49, 67, [moduleSize]));

  // Set error correction level (fn=69, cn=49)
  bytes.push(...qrCommand(3, 0, 49, 69, [errorCorrection]));

  // Store the QR data (fn=80, cn=49) — pL/pH encode (data.length + 3)
  const storeLen = data.length + 3;
  const pL = storeLen & 0xff;
  const pH = (storeLen >> 8) & 0xff;
  bytes.push(GS, 0x28, 0x6b, pL, pH, 49, 80, 48, ...data);

  // Print the stored QR code (fn=81, cn=49)
  bytes.push(...qrCommand(3, 0, 49, 81, [48]));

  return bytes;
}
