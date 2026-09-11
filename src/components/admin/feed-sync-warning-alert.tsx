import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import {
  feedHasSyncWarnings,
  feedSyncWarningKindLabel,
  type FeedSyncWarningReport,
} from "@/lib/feed-sync-warnings";

export type FeedSyncWarningFeed = {
  id: string;
  name: string;
  href: string;
  supplierName?: string | null;
  lastSyncWarnings: FeedSyncWarningReport | null;
};

function companyLabel(feed: FeedSyncWarningFeed) {
  return feed.supplierName?.trim() || feed.name;
}

export function FeedSyncWarningListAlert({ feeds }: { feeds: FeedSyncWarningFeed[] }) {
  const warned = feeds.filter((feed) => feedHasSyncWarnings(feed.lastSyncWarnings));
  if (warned.length === 0) return null;

  return (
    <div
      role="alert"
      className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
    >
      <p className="flex items-start gap-2 font-semibold">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
        <span>
          {warned.length.toLocaleString("tr-TR")} kaynakta eşleme veya satış kapanması uyarısı var.
          Firma kategori/marka kapatmış veya etiket adını değiştirmiş olabilir.
        </span>
      </p>
      <ul className="mt-2 space-y-1 pl-6">
        {warned.map((feed) => {
          const titles = (feed.lastSyncWarnings?.items ?? []).map((item) => item.title).slice(0, 3);
          return (
            <li key={feed.id}>
              <Link href={feed.href} className="font-semibold underline underline-offset-2">
                {companyLabel(feed)}
              </Link>
              <span className="text-amber-800"> — {titles.join(" · ")}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function FeedSyncWarningDetailAlert({
  report,
  companyName,
}: {
  report: FeedSyncWarningReport | null | undefined;
  companyName?: string | null;
}) {
  if (!feedHasSyncWarnings(report) || !report) return null;

  return (
    <div
      role="alert"
      className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
    >
      <p className="flex items-start gap-2 font-semibold">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
        <span>
          {companyName ? `${companyName}: ` : ""}
          Son senkron uyarısı — eşleme ve satışa kapanan ürünleri kontrol edin.
        </span>
      </p>
      <ul className="mt-3 space-y-3">
        {report.items.map((item) => (
          <li key={item.kind} className="rounded-md border border-amber-100 bg-white/70 px-3 py-2">
            <p className="text-xs font-semibold tracking-wide text-amber-800 uppercase">
              {feedSyncWarningKindLabel(item.kind)}
            </p>
            <p className="mt-0.5 font-medium text-slate-800">
              {item.title}
              {item.count > 0 ? (
                <span className="ml-1 font-normal text-slate-500">
                  ({item.count.toLocaleString("tr-TR")})
                </span>
              ) : null}
            </p>
            <p className="mt-1 text-xs text-slate-600">{item.detail}</p>
            {item.samples.length > 0 ? (
              <p className="mt-1 text-xs text-slate-500">{item.samples.join(" · ")}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FeedSyncWarningBadge({
  report,
}: {
  report: FeedSyncWarningReport | null | undefined;
}) {
  if (!feedHasSyncWarnings(report)) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
      <AlertTriangle className="h-3 w-3" />
      Uyarı
    </span>
  );
}
