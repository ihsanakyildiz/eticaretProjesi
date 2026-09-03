import type { Metadata } from "next";
import { listXmlFeeds } from "@/lib/xml-product-feed-store";
import { kickXmlFeedWorker } from "@/lib/xml-product-feed-worker";
import { ImportPageHeader, ImportSectionNav } from "../import-section-nav";
import { XmlFeedListPanel } from "../xml-feed-panel";
import { XmlFeedHelpButton } from "../xml-feed-help";

export const metadata: Metadata = {
  title: "XML kaynakları",
};

export default async function XmlFeedsPage() {
  const xmlFeeds = await listXmlFeeds().catch(() => []);
  if (
    xmlFeeds.some(
      (feed) => feed.running || (feed.isActive && feed.nextRunAt && new Date(feed.nextRunAt) <= new Date()),
    )
  ) {
    kickXmlFeedWorker();
  }

  return (
    <div className="space-y-6">
      <ImportPageHeader
        title="XML kaynakları"
        description="Kayıtlı tedarikçi XML’lerini yönetin. Her kaynağın eşlemesi kendi sayfasındadır; sayfayı yenileyince aynı kayda dönersiniz."
        actions={<XmlFeedHelpButton />}
      />
      <ImportSectionNav />
      <XmlFeedListPanel initialFeeds={xmlFeeds} />
    </div>
  );
}
