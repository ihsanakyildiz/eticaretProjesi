import type { Metadata } from "next";
import { BrandForm } from "../brand-form";
import { getSettingsMap } from "@/lib/settings";
import { parseUrlStructure, publicBrandIndexPath } from "@/lib/url-structure";

export const metadata: Metadata = {
  title: "Yeni Marka",
};

export default async function NewBrandPage() {
  const settings = await getSettingsMap().catch(() => ({}) as Record<string, string>);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Mağaza</p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">Yeni Marka</h1>
        <p className="mt-2 text-sm text-slate-500">
          Ürünlerde seçilebilecek yeni bir marka kaydı oluşturun.
        </p>
      </div>

      <BrandForm mode="create" brandPathPreview={publicBrandIndexPath(parseUrlStructure(settings))} />
    </div>
  );
}
