import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPublicLink } from "@/components/admin/admin-public-link";
import { ProductEditor } from "../../product-editor";
import { loadProductEditorInitial, loadProductEditorLookups } from "../../editor-options";
import { isAdvancedInventoryEnabledInMap } from "@/lib/advanced-inventory";
import { getSettingsMap } from "@/lib/settings";
import { publicProductHref } from "@/lib/public-urls";
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
  const urlStructure = parseUrlStructure(settings);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Mağaza</p>
            <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">Ürünü düzenle</h1>
            <p className="mt-2 text-sm text-slate-500">{initial.title}</p>
          </div>
          <AdminPublicLink
            href={publicProductHref(initial.slug ?? "", urlStructure, initial.urlId)}
            label="Sitede gör"
            variant="button"
          />
        </div>
      </div>

      <ProductEditor
        mode="edit"
        initial={initial}
        urlStructure={urlStructure}
        advancedInventory={isAdvancedInventoryEnabledInMap(settings)}
        {...lookups}
      />
    </div>
  );
}
