/**
 * ESC/POS command builder.
 *
 * A minimal, dependency-free implementation of the subset of the ESC/POS
 * protocol needed for retail receipt printing: init, text, alignment, bold,
 * font size, line feed, paper cut, cash drawer kick, and QR code printing.
 *
 * Reference: Epson ESC/POS Command Reference (widely cloned by XPrinter,
 * GoojPrt, Rongta, and most 58mm/80mm thermal printers sold in Pakistan).
 *
 * This builder produces a plain Uint8Array — how those bytes reach the
 * physical printer (USB / Network / Bluetooth) is handled separately in
 * `./connections/*`.
 */

const ESC = 0x1b;
const GS = 0x1d;

export type Alignment = "left" | "center" | "right";

export class EscPosBuilder {
  private chunks: number[] = [];

  /** Initialize the printer — always call this first. */
  init(): this {
    this.chunks.push(ESC, 0x40);
    return this;
  }

  /** Raw text, encoded as UTF-8 bytes. Most modern thermal printers (2018+)
   *  support a UTF-8 code page; older ones may show mangled non-ASCII text —
   *  see README for the code-page caveat. */
  text(value: string): this {
    const bytes = new TextEncoder().encode(value);
    this.chunks.push(...bytes);
    return this;
  }

  /** Text followed by a line feed. */
  line(value = ""): this {
    return this.text(value).feed(1);
  }

  /** Feed n blank lines (default 1). */
  feed(lines = 1): this {
    for (let i = 0; i < lines; i++) this.chunks.push(0x0a);
    return this;
  }

  align(alignment: Alignment): this {
    const map: Record<Alignment, number> = { left: 0, center: 1, right: 2 };
    this.chunks.push(ESC, 0x61, map[alignment]);
    return this;
  }

  bold(on: boolean): this {
    this.chunks.push(ESC, 0x45, on ? 1 : 0);
    return this;
  }

  underline(on: boolean): this {
    this.chunks.push(ESC, 0x2d, on ? 1 : 0);
    return this;
  }

  /** GS ! n — character size. widthMult/heightMult are 1–8 (1 = normal). */
  size(widthMult: number, heightMult: number): this {
    const w = Math.min(Math.max(widthMult, 1), 8) - 1;
    const h = Math.min(Math.max(heightMult, 1), 8) - 1;
    const n = (w << 4) | h;
    this.chunks.push(GS, 0x21, n);
    return this;
  }

  resetSize(): this {
    return this.size(1, 1);
  }

  /** Draws a full-width divider line of repeated characters (e.g. "-"). */
  divider(charWidth: number, char = "-"): this {
    return this.line(char.repeat(charWidth));
  }

  /** Left-label / right-value row, padded to the given character width —
   *  e.g. "Subtotal" ................ "9,500" on one line. */
  row(left: string, right: string, charWidth: number): this {
    const space = Math.max(charWidth - left.length - right.length, 1);
    return this.line(left + " ".repeat(space) + right);
  }

  /** GS V — cut paper. Uses partial cut (leaves a small connecting strip)
   *  so the receipt doesn't fall off before the customer takes it. */
  cut(): this {
    this.chunks.push(GS, 0x56, 0x42, 0x00);
    return this;
  }

  /** ESC p — pulse the cash drawer's kick-out connector (standard 2-pin
   *  RJ11/RJ12 drawer wired through the printer). m = pin 0 or 1, t1/t2 are
   *  the on/off pulse timings in ~2ms units; 25/250 (≈50ms/500ms) is the
   *  widely-used default that works with most drawers. */
  openCashDrawer(pin: 0 | 1 = 0): this {
    this.chunks.push(ESC, 0x70, pin, 25, 250);
    return this;
  }

  /** Appends raw pre-built bytes (e.g. a QR code block from qrcode.ts). */
  raw(bytes: Uint8Array | number[]): this {
    this.chunks.push(...bytes);
    return this;
  }

  build(): Uint8Array {
    return new Uint8Array(this.chunks);
  }
}
