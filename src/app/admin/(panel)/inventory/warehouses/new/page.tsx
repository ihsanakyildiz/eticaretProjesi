import type { Metadata } from "next";
import { WarehouseForm } from "../warehouse-form";

export const metadata: Metadata = {
  title: "Yeni depo",
};

export default function NewWarehousePage() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Stok ve depolar</p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">Yeni depo</h1>
        <p className="mt-2 text-sm text-slate-500">
          Yeni bir fiziksel lokasyon ekleyin. Kod kısa ve benzersiz olsun (IST, IZM, ADA).
        </p>
      </div>
      <WarehouseForm mode="create" />
    </div>
  );
}
