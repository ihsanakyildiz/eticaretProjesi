import type { Metadata } from "next";
import { loadAdminImportLookups } from "../../import-lookups";
import { ImportPageHeader, ImportSectionNav } from "../../import-section-nav";
import { ApiFeedEditorPanel } from "../../api-feed-panel";
import { ApiFeedHelpButton } from "../../api-feed-help";

export const metadata: Metadata = {
  title: "Yeni API kaynağı",
};

export default async function NewApiFeedPage() {
  const { categories, brands, suppliers } = await loadAdminImportLookups();

  return (
    <div className="space-y-6">
      <ImportPageHeader
        title="Yeni API kaynağı"
        description="Ürün listesi JSON adresi veya OpenAPI / doküman adresi ekleyin, alanları eşleyin ve kaydedin. Kayıttan sonra kaynağın kendi sayfasına geçilir."
        actions={<ApiFeedHelpButton />}
      />
      <ImportSectionNav />
      <ApiFeedEditorPanel
        initialFeed={null}
        categories={categories}
        brands={brands}
        suppliers={suppliers}
      />
    </div>
  );
}
