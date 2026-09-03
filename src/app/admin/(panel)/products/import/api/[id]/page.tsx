import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getApiFeed } from "@/lib/api-product-feed-store";
import { kickApiFeedWorker } from "@/lib/api-product-feed-worker";
import { loadAdminImportLookups } from "../../import-lookups";
import { ImportPageHeader, ImportSectionNav } from "../../import-section-nav";
import { ApiFeedEditorPanel } from "../../api-feed-panel";
import { ApiFeedHelpButton } from "../../api-feed-help";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const feed = await getApiFeed(id).catch(() => null);
  return {
    title: feed ? `${feed.name} · API kaynağı` : "API kaynağı",
  };
}

export default async function ApiFeedEditPage({ params }: Props) {
  const { id } = await params;
  const [feed, lookups] = await Promise.all([
    getApiFeed(id),
    loadAdminImportLookups(),
  ]);
  if (!feed) notFound();
  if (feed.running || (feed.isActive && feed.nextRunAt && new Date(feed.nextRunAt) <= new Date())) {
    kickApiFeedWorker();
  }

  return (
    <div className="space-y-6">
      <ImportPageHeader
        title={feed.name}
        description={feed.url}
        actions={<ApiFeedHelpButton />}
      />
      <ImportSectionNav />
      <ApiFeedEditorPanel
        initialFeed={feed}
        categories={lookups.categories}
        brands={lookups.brands}
        suppliers={lookups.suppliers}
      />
    </div>
  );
}
