"use client";

import * as React from "react";

/**
 * USB barcode scanners (the vast majority sold as "plug and play") work as
 * HID keyboard-wedge devices: they don't need any driver — they just "type"
 * the barcode characters very fast and then send Enter. This hook detects
 * that pattern globally (keystrokes arriving faster than any human could
 * type, ending in Enter) and reports the scanned code, without requiring
 * the barcode field to be focused.
 *
 * Usage:
 *   useBarcodeScanner((code) => { ...look up product by barcode... });
 */
export function useBarcodeScanner(onScan: (code: string) => void, enabled = true) {
  const bufferRef = React.useRef("");
  const lastKeyTimeRef = React.useRef(0);

  React.useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      const now = Date.now();
      const elapsed = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Scanner keystrokes arrive within a few ms of each other — anything
      // slower than ~50ms between characters is very likely a human typing,
      // so reset the buffer to avoid false positives while someone types in
      // a normal input field.
      if (elapsed > 50) {
        bufferRef.current = "";
      }

      if (e.key === "Enter") {
        const code = bufferRef.current.trim();
        bufferRef.current = "";
        // Require a plausible barcode length to avoid triggering on a
        // stray fast Enter press.
        if (code.length >= 4) {
          onScan(code);
        }
        return;
      }

      if (e.key.length === 1) {
        bufferRef.current += e.key;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onScan, enabled]);
}
