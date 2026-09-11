import { FeedSyncWarningListAlert } from "@/components/admin/feed-sync-warning-alert";
import { listFeedsWithSyncWarnings } from "@/lib/feed-sync-warning-list";
import { IMPORT_PATHS } from "@/app/admin/(panel)/products/import/import-paths";

function feedWarningHref(kind: "xml" | "api", id: string) {
  switch (kind) {
    case "xml":
      return IMPORT_PATHS.xmlFeed(id);
    case "api":
      return IMPORT_PATHS.apiFeed(id);
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export async function FeedSyncWarningCatalogBanner() {
  const feeds = await listFeedsWithSyncWarnings();
  if (feeds.length === 0) return null;
  return (
    <FeedSyncWarningListAlert
      feeds={feeds.map((feed) => ({
        ...feed,
        href: feedWarningHref(feed.kind, feed.id),
      }))}
    />
  );
}
