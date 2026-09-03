import type { Metadata } from "next";
import { loadAdminImportLookups } from "../../import-lookups";
import { ImportPageHeader, ImportSectionNav } from "../../import-section-nav";
import { XmlFeedEditorPanel } from "../../xml-feed-panel";
import { XmlFeedHelpButton } from "../../xml-feed-help";

export const metadata: Metadata = {
  title: "Yeni XML kaynağı",
};

export default async function NewXmlFeedPage() {
  const { categories, brands, suppliers } = await loadAdminImportLookups();

  return (
    <div className="space-y-6">
      <ImportPageHeader
        title="Yeni XML kaynağı"
        description="Tedarikçi XML adresini ekleyin, alanları eşleyin ve kaydedin. Kayıttan sonra kaynağın kendi sayfasına geçilir."
        actions={<XmlFeedHelpButton />}
      />
      <ImportSectionNav />
      <XmlFeedEditorPanel
        initialFeed={null}
        categories={categories}
        brands={brands}
        suppliers={suppliers}
      />
    </div>
  );
}
