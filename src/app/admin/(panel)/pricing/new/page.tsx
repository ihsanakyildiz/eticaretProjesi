import type { Metadata } from "next";
import { PricingPlanForm } from "../pricing-plan-form";

export const metadata: Metadata = {
  title: "Yeni Fiyat Paketi",
};

export default function NewPricingPlanPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
          Fiyatlandırma
        </p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">
          Yeni Paket
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Tek seferlik proje fiyatı, özellik listesi ve CTA ayarlarını girin.
        </p>
      </div>
      <PricingPlanForm mode="create" />
    </div>
  );
}
