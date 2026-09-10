import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getXmlFeed } from "@/lib/xml-product-feed-store";
import { kickXmlFeedWorker } from "@/lib/xml-product-feed-worker";
import { loadAdminImportLookups } from "../../import-lookups";
import { ImportPageHeader, ImportSectionNav } from "../../import-section-nav";
import { XmlFeedEditorPanel } from "../../xml-feed-panel";
import { XmlFeedHelpButton } from "../../xml-feed-help";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const feed = await getXmlFeed(id).catch(() => null);
  return {
    title: feed ? `${feed.name} · XML kaynağı` : "XML kaynağı",
  };
}

export default async function XmlFeedEditPage({ params }: Props) {
  const { id } = await params;
  const [feed, lookups] = await Promise.all([
    getXmlFeed(id),
    loadAdminImportLookups(),
  ]);
  if (!feed) notFound();
  if (feed.running || (feed.isActive && feed.nextRunAt && new Date(feed.nextRunAt) <= new Date())) {
    kickXmlFeedWorker();
  }

  return (
    <div className="space-y-6">
      <ImportPageHeader
        title={feed.name}
        description={feed.url}
        actions={<XmlFeedHelpButton />}
      />
      <ImportSectionNav />
      <XmlFeedEditorPanel
        initialFeed={feed}
        categories={lookups.categories}
        brands={lookups.brands}
        suppliers={lookups.suppliers}
        filters={lookups.filters}
      />
    </div>
  );
}
