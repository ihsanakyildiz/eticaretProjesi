import type { Metadata } from "next";
import { TaxRateForm } from "../tax-rate-form";

export const metadata: Metadata = {
  title: "Yeni KDV Oranı",
};

export default function NewTaxRatePage() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Mağaza</p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">Yeni KDV Oranı</h1>
        <p className="mt-2 text-sm text-slate-500">
          Ürün fiyatlandırmasında seçilebilecek yeni bir KDV yüzdesi ekleyin.
        </p>
      </div>

      <TaxRateForm mode="create" />
    </div>
  );
}
