import { Truck } from "lucide-react";

export default function ShippingLoading() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Mağaza</p>
        <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold text-slate-800 sm:text-2xl">
          <Truck className="h-6 w-6 text-[#405189]" />
          Kargo firmaları
        </h1>
        <p className="mt-2 text-sm text-slate-500">Firmalar yükleniyor…</p>
      </div>
      <div className="rounded-lg border border-[#e9ebec] bg-white px-4 py-12 text-center text-sm text-slate-500 shadow-sm">
        Liste hazırlanıyor…
      </div>
    </div>
  );
}
