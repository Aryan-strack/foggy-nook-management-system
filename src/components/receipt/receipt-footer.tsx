"use client";

import * as React from "react";
import QRCode from "qrcode";
import type { ReceiptData } from "@/types";

export function ReceiptFooter({ data }: { data: ReceiptData }) {
  const [qrDataUrl, setQrDataUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (data.showQrCode && data.qrValue) {
      QRCode.toDataURL(data.qrValue, { margin: 0, width: 160 }).then(setQrDataUrl);
    } else {
      setQrDataUrl(null);
    }
  }, [data.showQrCode, data.qrValue]);

  return (
    <div className="flex flex-col items-center gap-1 text-center text-[11px]">
      <p className="font-semibold">Thank You For Shopping</p>
      {data.footerMessage && <p>{data.footerMessage}</p>}
      {data.branchWhatsapp && (
        <div className="flex flex-col">
          <span>WhatsApp</span>
          <span>{data.branchWhatsapp}</span>
        </div>
      )}
      {qrDataUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={qrDataUrl} alt="QR code" className="mt-1 size-16" />
      )}
    </div>
  );
}
