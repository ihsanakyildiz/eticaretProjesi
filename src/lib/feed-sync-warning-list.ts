import "server-only";

import { listApiFeeds } from "@/lib/api-product-feed-store";
import { feedHasSyncWarnings, type FeedSyncWarningReport } from "@/lib/feed-sync-warnings";
import { listXmlFeeds } from "@/lib/xml-product-feed-store";

export type FeedSyncWarningListItem = {
  id: string;
  name: string;
  supplierName: string | null;
  kind: "xml" | "api";
  lastSyncWarnings: FeedSyncWarningReport;
};

export async function listFeedsWithSyncWarnings(): Promise<FeedSyncWarningListItem[]> {
  const [xmlFeeds, apiFeeds] = await Promise.all([
    listXmlFeeds().catch(() => []),
    listApiFeeds().catch(() => []),
  ]);
  const items: FeedSyncWarningListItem[] = [];
  for (const feed of xmlFeeds) {
    if (!feedHasSyncWarnings(feed.lastSyncWarnings) || !feed.lastSyncWarnings) continue;
    items.push({
      id: feed.id,
      name: feed.name,
      supplierName: feed.supplierName,
      kind: "xml",
      lastSyncWarnings: feed.lastSyncWarnings,
    });
  }
  for (const feed of apiFeeds) {
    if (!feedHasSyncWarnings(feed.lastSyncWarnings) || !feed.lastSyncWarnings) continue;
    items.push({
      id: feed.id,
      name: feed.name,
      supplierName: feed.supplierName,
      kind: "api",
      lastSyncWarnings: feed.lastSyncWarnings,
    });
  }
  return items;
}
