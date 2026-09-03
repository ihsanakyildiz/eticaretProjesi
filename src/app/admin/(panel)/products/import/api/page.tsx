import type { Metadata } from "next";
import { listApiFeeds } from "@/lib/api-product-feed-store";
import { kickApiFeedWorker } from "@/lib/api-product-feed-worker";
import { ImportPageHeader, ImportSectionNav } from "../import-section-nav";
import { ApiFeedListPanel } from "../api-feed-panel";
import { ApiFeedHelpButton } from "../api-feed-help";

export const metadata: Metadata = {
  title: "API kaynakları",
};

export default async function ApiFeedsPage() {
  const apiFeeds = await listApiFeeds().catch(() => []);
  if (
    apiFeeds.some(
      (feed) => feed.running || (feed.isActive && feed.nextRunAt && new Date(feed.nextRunAt) <= new Date()),
    )
  ) {
    kickApiFeedWorker();
  }

  return (
    <div className="space-y-6">
      <ImportPageHeader
        title="API kaynakları"
        description="Harici JSON API’lerden ürün çekin. Her kaynağın eşlemesi kendi sayfasındadır; kayıtlı aralıkta otomatik güncellenir."
        actions={<ApiFeedHelpButton />}
      />
      <ImportSectionNav />
      <ApiFeedListPanel initialFeeds={apiFeeds} />
    </div>
  );
}
