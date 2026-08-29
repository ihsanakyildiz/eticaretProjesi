import type { Metadata } from "next";
import { ProductEditor } from "../product-editor";
import { loadProductEditorLookups } from "../editor-options";
import { getSettingsMap } from "@/lib/settings";
import { parseUrlStructure } from "@/lib/url-structure";

export const metadata: Metadata = {
  title: "Yeni ürün",
};

export default async function NewProductPage() {
  const lookups = await loadProductEditorLookups();
  const settings = await getSettingsMap().catch(() => ({}) as Record<string, string>);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Mağaza</p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">Yeni ürün</h1>
        <p className="mt-2 text-sm text-slate-500">
          Üstteki sekmelerden açıklama, varyant, fiyat ve SEO bilgilerini doldurun. Altta taslak
          kaydedebilir veya yayınlayabilirsiniz.
        </p>
      </div>

      <ProductEditor mode="create" urlStructure={parseUrlStructure(settings)} {...lookups} />
    </div>
  );
}
