import { code39Svg } from "@/lib/code39";

export type WarehouseCargoLabelProps = {
  siteName: string;
  orderNo: number;
  reference: string;
  trackingNumber: string;
  carrierName: string;
  customerName: string;
  addressLines: string[];
  itemCount: number;
};

export function WarehouseCargoLabel({
  siteName,
  orderNo,
  reference,
  trackingNumber,
  carrierName,
  customerName,
  addressLines,
  itemCount,
}: WarehouseCargoLabelProps) {
  const barcode = trackingNumber.trim() || reference;
  const svg = code39Svg(barcode, { height: 80, module: 2 });

  return (
    <article className="warehouse-cargo-label mx-auto w-full max-w-[420px] rounded-lg border-2 border-slate-800 bg-white p-5 text-slate-900 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
      <p className="text-[11px] font-semibold tracking-[0.2em] text-slate-500 uppercase">{siteName}</p>
      <div className="mt-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500">Sipariş</p>
          <p className="text-2xl font-bold tracking-tight">#{orderNo}</p>
          <p className="font-mono text-sm text-slate-600">{reference}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Kargo</p>
          <p className="text-sm font-semibold">{carrierName || "Depo"}</p>
          <p className="text-xs text-slate-500">{itemCount} ürün</p>
        </div>
      </div>

      <div className="mt-4 border-y border-dashed border-slate-300 py-3">
        <p className="text-xs font-semibold text-slate-500 uppercase">Alıcı</p>
        <p className="mt-1 text-base font-semibold">{customerName}</p>
        {addressLines.map((line, index) => (
          <p key={`${index}-${line}`} className="text-sm leading-snug text-slate-700">
            {line}
          </p>
        ))}
      </div>

      <div className="mt-4 text-center">
        <p className="mb-2 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
          Kargo barkodu
        </p>
        <div
          className="flex justify-center overflow-hidden text-slate-900"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <p className="mt-2 font-mono text-lg font-bold tracking-widest">{barcode}</p>
      </div>
    </article>
  );
}
