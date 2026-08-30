import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductEditor } from "../../product-editor";
import { loadProductEditorInitial, loadProductEditorLookups } from "../../editor-options";
import { getSettingsMap } from "@/lib/settings";
import { parseUrlStructure } from "@/lib/url-structure";

type EditProductPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: EditProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const initial = await loadProductEditorInitial(id);
  return { title: initial ? `Düzenle: ${initial.title}` : "Ürün düzenle" };
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params;
  const initial = await loadProductEditorInitial(id);
  if (!initial) notFound();

  const [lookups, settings] = await Promise.all([
    loadProductEditorLookups({
      brandId: initial.brandId,
      supplierId: initial.supplierId,
      excludeProductId: initial.id,
    }),
    getSettingsMap().catch(() => ({}) as Record<string, string>),
  ]);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Mağaza</p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">Ürünü düzenle</h1>
        <p className="mt-2 text-sm text-slate-500">{initial.title}</p>
      </div>

      <ProductEditor mode="edit" initial={initial} urlStructure={parseUrlStructure(settings)} {...lookups} />
    </div>
  );
}
