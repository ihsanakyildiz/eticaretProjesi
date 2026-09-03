import type { Metadata } from "next";
import { loadAdminImportLookups } from "../../import-lookups";
import { ExcelModeNav, ImportPageHeader, ImportSectionNav } from "../../import-section-nav";
import { ProductUpdatePanel } from "../../product-update-panel";

export const metadata: Metadata = {
  title: "Excel ile ürün güncelle",
};

export default async function ExcelUpdatePage() {
  const { categories, brands } = await loadAdminImportLookups();

  return (
    <div className="space-y-6">
      <ImportPageHeader
        title="Excel ile ürün güncelle"
        description="Mevcut ürünleri barkod veya ürün koduna göre Excel dosyasından güncelleyin."
      />
      <ImportSectionNav />
      <ExcelModeNav />
      <ProductUpdatePanel categories={categories} brands={brands} />
    </div>
  );
}
