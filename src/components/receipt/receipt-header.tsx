import type { ReceiptData } from "@/types";

export function ReceiptHeader({ data }: { data: ReceiptData }) {
  return (
    <div className="flex flex-col items-center gap-0.5 text-center">
      {data.logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={data.logoUrl} alt={data.shopName} className="mb-1 h-10 object-contain" />
      )}
      <p className="text-base font-bold uppercase tracking-wide">{data.shopName}</p>
      <p className="text-xs">Smoke &amp; Vape Shop</p>
      <p className="text-xs font-medium">{data.branchName}</p>
      {data.branchAddress && <p className="text-[11px]">{data.branchAddress}</p>}
      {data.branchPhone && <p className="text-[11px]">Tel: {data.branchPhone}</p>}
      {data.branchWhatsapp && <p className="text-[11px]">WhatsApp: {data.branchWhatsapp}</p>}
    </div>
  );
}
