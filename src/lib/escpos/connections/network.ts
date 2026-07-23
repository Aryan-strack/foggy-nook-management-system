/**
 * Network (LAN) transport for ESC/POS thermal printers.
 *
 * Browsers cannot open raw TCP sockets directly, so this calls our own
 * Next.js API route (`/api/print/network`), which opens the raw socket to
 * the printer's IP:port (typically 9100) using Node's `net` module and
 * streams the bytes through.
 *
 * IMPORTANT: this only works if the machine running the Next.js server can
 * reach the printer's IP — i.e. they're on the same LAN (or the printer is
 * reachable via VPN/port-forward). If you deploy this app to a cloud host
 * like Vercel, it cannot reach a printer sitting inside a shop's local
 * network; run the app on a local machine/server at that branch instead, or
 * point this at a small local print-relay service.
 */

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export async function printViaNetwork(
  ip: string,
  port: number,
  bytes: Uint8Array
): Promise<void> {
  const res = await fetch("/api/print/network", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ip, port, data: toBase64(bytes) }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error ?? `Network printer at ${ip}:${port} did not respond.`);
  }
}
