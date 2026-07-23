import { NextRequest, NextResponse } from "next/server";
import net from "node:net";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function sendRawTcp(ip: string, port: number, data: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error(`Timed out connecting to printer at ${ip}:${port}`));
    }, 5000);

    socket.connect(port, ip, () => {
      socket.write(data, (err) => {
        clearTimeout(timeout);
        if (err) {
          socket.destroy();
          reject(err);
          return;
        }
        // give the printer a moment to consume the buffer before we close
        setTimeout(() => {
          socket.end();
          resolve();
        }, 250);
      });
    });

    socket.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

export async function POST(request: NextRequest) {
  // Require an authenticated session — this route can reach arbitrary LAN
  // IPs from the server, so it must not be callable anonymously.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { ip, port, data } = body ?? {};

  if (!ip || typeof ip !== "string" || !data || typeof data !== "string") {
    return NextResponse.json({ error: "Missing ip or data" }, { status: 400 });
  }

  const targetPort = Number(port) || 9100;
  const buffer = Buffer.from(data, "base64");

  try {
    await sendRawTcp(ip, targetPort, buffer);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to reach network printer" },
      { status: 502 }
    );
  }
}
