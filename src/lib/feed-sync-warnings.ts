export const FEED_SYNC_WARNING_KINDS = [
  "missing_mapped_tag",
  "vanished_category",
  "vanished_brand",
  "unmapped_category",
  "unmapped_brand",
  "skipped_unmapped",
  "closed_missing",
  "closed_for_sale",
] as const;

export type FeedSyncWarningKind = (typeof FEED_SYNC_WARNING_KINDS)[number];

export type FeedSaleCloseReason =
  | "close_all"
  | "stock_limit"
  | "zero_stock"
  | "zero_price"
  | "no_image"
  | "feed_closed";

export type FeedSyncWarningItem = {
  kind: FeedSyncWarningKind;
  title: string;
  detail: string;
  samples: string[];
  count: number;
};

export type FeedSyncWarningReport = {
  at: string;
  items: FeedSyncWarningItem[];
};

const SAMPLE_LIMIT = 12;

function foldKey(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR");
}

function isWarningKind(value: string): value is FeedSyncWarningKind {
  return (FEED_SYNC_WARNING_KINDS as readonly string[]).includes(value);
}

function parseSamples(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, SAMPLE_LIMIT);
}

function parseWarningItem(value: unknown): FeedSyncWarningItem | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const kind = typeof record.kind === "string" ? record.kind : "";
  if (!isWarningKind(kind)) return null;
  const title = typeof record.title === "string" ? record.title.trim() : "";
  const detail = typeof record.detail === "string" ? record.detail.trim() : "";
  const count = typeof record.count === "number" && Number.isFinite(record.count) ? Math.max(0, Math.floor(record.count)) : 0;
  if (!title) return null;
  return {
    kind,
    title: title.slice(0, 160),
    detail: detail.slice(0, 500),
    samples: parseSamples(record.samples),
    count,
  };
}

export function parseFeedSyncWarningReport(value: unknown): FeedSyncWarningReport | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const items = Array.isArray(record.items)
    ? record.items.map(parseWarningItem).filter((item): item is FeedSyncWarningItem => Boolean(item))
    : [];
  if (items.length === 0) return null;
  const at = typeof record.at === "string" && record.at.trim() ? record.at : new Date().toISOString();
  return { at, items };
}

export function feedSyncWarningCount(report: FeedSyncWarningReport | null | undefined) {
  return report?.items.length ?? 0;
}

export function feedHasSyncWarnings(report: FeedSyncWarningReport | null | undefined) {
  return feedSyncWarningCount(report) > 0;
}

export function mergeLastSyncWarningsIntoMapJson(
  categoryMapJson: string,
  warnings: FeedSyncWarningReport | null,
) {
  let record: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(categoryMapJson || "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      record = { ...(parsed as Record<string, unknown>) };
    }
  } catch {
    record = {};
  }
  if (warnings && warnings.items.length > 0) record.lastSyncWarnings = warnings;
  else delete record.lastSyncWarnings;
  return JSON.stringify(record);
}

function uniqueSamples(values: Iterable<string>, limit = SAMPLE_LIMIT) {
  const seen = new Set<string>();
  const samples: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = foldKey(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    samples.push(trimmed.slice(0, 120));
    if (samples.length >= limit) break;
  }
  return samples;
}

function pushWarning(
  items: FeedSyncWarningItem[],
  kind: FeedSyncWarningKind,
  title: string,
  detail: string,
  samples: string[],
  count: number,
) {
  if (count <= 0 && samples.length === 0) return;
  items.push({
    kind,
    title,
    detail,
    samples: samples.slice(0, SAMPLE_LIMIT),
    count: Math.max(count, samples.length),
  });
}

function feedSaleCloseReasonLabel(reason: FeedSaleCloseReason) {
  switch (reason) {
    case "close_all":
      return "kaynak tümünü kapatıyor";
    case "stock_limit":
      return "stok eşiği";
    case "zero_stock":
      return "stok 0";
    case "zero_price":
      return "fiyat 0 / boş";
    case "no_image":
      return "görsel yok";
    case "feed_closed":
      return "kaynak satış kapalı";
    default: {
      const _exhaustive: never = reason;
      return _exhaustive;
    }
  }
}

type AliasRow = { from: string; to: string };

class UniqueBag {
  private readonly originals = new Map<string, string>();

  add(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    const key = foldKey(trimmed);
    if (!this.originals.has(key)) this.originals.set(key, trimmed);
  }

  has(value: string) {
    return this.originals.has(foldKey(value));
  }

  samples(limit = SAMPLE_LIMIT) {
    return uniqueSamples(this.originals.values(), limit);
  }

  get size() {
    return this.originals.size;
  }
}

export function createFeedSyncWarningCollector() {
  const seenCategories = new UniqueBag();
  const seenBrands = new UniqueBag();
  const unmappedCategories = new UniqueBag();
  const unmappedBrands = new UniqueBag();
  const closeReasons = new Map<FeedSaleCloseReason, number>();
  let skippedUnmapped = 0;
  let skippedExistingUnmapped = 0;
  let closedForSale = 0;

  return {
    noteCategorySource(value: string) {
      seenCategories.add(value);
    },
    noteBrandSource(value: string) {
      seenBrands.add(value);
    },
    noteSkip(
      row: {
        category?: string;
        brand?: string;
        categorySource?: string;
        brandSource?: string;
        categoryRejected?: boolean;
        brandRejected?: boolean;
      },
      existing: boolean,
      flags: { category: boolean; brand: boolean },
    ) {
      const categoryIntentional = row.categoryRejected === true && !(row.category ?? "").trim();
      const brandIntentional = row.brandRejected === true && !(row.brand ?? "").trim();
      const category = flags.category && !categoryIntentional;
      const brand = flags.brand && !brandIntentional;
      if (!category && !brand) return;
      skippedUnmapped += 1;
      if (existing) skippedExistingUnmapped += 1;
      if (category) unmappedCategories.add(row.categorySource || row.category || "");
      if (brand) unmappedBrands.add(row.brandSource || row.brand || "");
    },
    noteClosed(reasons: FeedSaleCloseReason[]) {
      if (reasons.length === 0) return;
      closedForSale += 1;
      for (const reason of reasons) {
        closeReasons.set(reason, (closeReasons.get(reason) ?? 0) + 1);
      }
    },
    build(input: {
      categoryAliases: AliasRow[];
      brandAliases: AliasRow[];
      missingMappedTags: string[];
      deactivatedMissing: number;
      closeAll: boolean;
      ignoreVanished?: boolean;
    }): FeedSyncWarningReport | null {
      const items: FeedSyncWarningItem[] = [];
      const missingTags = uniqueSamples(input.missingMappedTags);
      pushWarning(
        items,
        "missing_mapped_tag",
        "Eşlenen etiket kaynakta yok",
        "Firma XML/API etiket adını değiştirmiş veya alanı kapatmış olabilir. Eşlemeyi yeniden çekip kontrol edin; aksi halde ürünler eşlenemez ve satışa kapanabilir.",
        missingTags,
        missingTags.length,
      );

      const vanishedCategories = input.ignoreVanished
        ? []
        : input.categoryAliases
            .filter((alias) => alias.from.trim() && alias.to.trim() && !seenCategories.has(alias.from))
            .map((alias) => alias.from);
      pushWarning(
        items,
        "vanished_category",
        "Eşlenen kategori artık gelmiyor",
        "Daha önce eşlediğiniz kategori kaynakta yok. Firma kategoriyi kapatmış veya adını değiştirmiş olabilir.",
        uniqueSamples(vanishedCategories),
        vanishedCategories.length,
      );

      const vanishedBrands = input.ignoreVanished
        ? []
        : input.brandAliases
            .filter((alias) => alias.from.trim() && alias.to.trim() && !seenBrands.has(alias.from))
            .map((alias) => alias.from);
      pushWarning(
        items,
        "vanished_brand",
        "Eşlenen marka artık gelmiyor",
        "Daha önce eşlediğiniz marka kaynakta yok. Firma markayı kapatmış veya adını değiştirmiş olabilir.",
        uniqueSamples(vanishedBrands),
        vanishedBrands.length,
      );

      pushWarning(
        items,
        "unmapped_category",
        "Yeni / eşlenmeyen kategori",
        "Kaynaktan gelen bu kategoriler mağazada eşlenmediği için içindeki ürünler çekilmedi.",
        unmappedCategories.samples(),
        unmappedCategories.size,
      );
      pushWarning(
        items,
        "unmapped_brand",
        "Yeni / eşlenmeyen marka",
        "Kaynaktan gelen bu markalar mağazada eşlenmediği için içindeki ürünler çekilmedi.",
        unmappedBrands.samples(),
        unmappedBrands.size,
      );

      if (skippedUnmapped > 0) {
        pushWarning(
          items,
          "skipped_unmapped",
          "Eşlenmeyen ürünler atlandı",
          skippedExistingUnmapped > 0
            ? `${skippedUnmapped.toLocaleString("tr-TR")} satır eşlenmediği için atlandı. Bunlardan ${skippedExistingUnmapped.toLocaleString("tr-TR")} tanesi sitede zaten vardı; kaynaktan düşmüş gibi satışa kapanabilir.`
            : `${skippedUnmapped.toLocaleString("tr-TR")} satır eşlenmeyen kategori veya marka nedeniyle atlandı.`,
          [],
          skippedUnmapped,
        );
      }

      if (input.deactivatedMissing > 0) {
        pushWarning(
          items,
          "closed_missing",
          "Kaynaktan düşen ürünler satışa kapatıldı",
          skippedExistingUnmapped > 0
            ? `${input.deactivatedMissing.toLocaleString("tr-TR")} ürün bu çalışmada kaynakta görülmediği için satışa kapatıldı. Bir kısmı eşlenmeyen kategori, marka veya değişen etiket nedeniyle atlanmış olabilir.`
            : `${input.deactivatedMissing.toLocaleString("tr-TR")} ürün bu çalışmada kaynakta yoktu ve otomatik satışa kapatıldı. Firma ürünü/kategoriyi kaldırmış olabilir.`,
          [],
          input.deactivatedMissing,
        );
      }

      if (closedForSale > 0 && !input.closeAll) {
        const reasonText = [...closeReasons.entries()]
          .sort((left, right) => right[1] - left[1])
          .filter(([reason]) => reason !== "close_all")
          .map(([reason, count]) => `${feedSaleCloseReasonLabel(reason)} (${count.toLocaleString("tr-TR")})`)
          .join(", ");
        pushWarning(
          items,
          "closed_for_sale",
          "Ürünler otomatik satışa kapatıldı",
          `Bu çalışmada ${closedForSale.toLocaleString("tr-TR")} mevcut ürün satışa kapatıldı${reasonText ? `: ${reasonText}` : ""}. Beklenmeyen bir kapanma varsa eşleme, fiyat, stok ve görsel alanlarını kontrol edin.`,
          [],
          closedForSale,
        );
      }

      if (items.length === 0) return null;
      return { at: new Date().toISOString(), items };
    },
  };
}

export function formatFeedSyncWarningHeadline(report: FeedSyncWarningReport | null | undefined) {
  if (!report || report.items.length === 0) return "";
  const labels = report.items.map((item) => item.title);
  if (labels.length === 1) return `Uyarı: ${labels[0]}`;
  return `Uyarı: ${labels.slice(0, 2).join(" · ")}${labels.length > 2 ? ` (+${labels.length - 2})` : ""}`;
}

export function formatFeedLastMessageWithWarnings(summary: string, report: FeedSyncWarningReport | null) {
  const headline = formatFeedSyncWarningHeadline(report);
  const base = summary.split("\n")[0]?.trim() || summary.trim();
  const text = headline ? `${headline}. ${base}` : base;
  return text.slice(0, 500);
}

export function appendFeedSyncWarningsToRunMessage(summary: string, report: FeedSyncWarningReport | null) {
  if (!report || report.items.length === 0) return summary;
  return [
    summary,
    "",
    "Uyarılar:",
    ...report.items.map((item) => {
      const samples = item.samples.length > 0 ? ` — ${item.samples.slice(0, 6).join(", ")}` : "";
      return `• ${item.title} (${item.count})${samples}`;
    }),
  ].join("\n");
}

export function feedSyncWarningKindLabel(kind: FeedSyncWarningKind) {
  switch (kind) {
    case "missing_mapped_tag":
      return "Etiket";
    case "vanished_category":
    case "unmapped_category":
      return "Kategori";
    case "vanished_brand":
    case "unmapped_brand":
      return "Marka";
    case "skipped_unmapped":
      return "Atlanan";
    case "closed_missing":
    case "closed_for_sale":
      return "Satış";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}
