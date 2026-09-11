import { slugify } from "@/lib/slug";
import {
  parseFeedSyncWarningReport,
  type FeedSaleCloseReason,
  type FeedSyncWarningReport,
} from "@/lib/feed-sync-warnings";

export const XML_FEED_MAX_BYTES = 25 * 1024 * 1024;
export const XML_FEED_MAX_ITEMS = 20000;
export const XML_FEED_PREVIEW_ITEMS = 8;
export const XML_FEED_WRITE_BATCH = 40;
/** Varyantlı ürünlerde tek işlemde yazılacak SKU satırı üst sınırı. */
export const XML_FEED_WRITE_ROW_BUDGET = 40;
export const XML_FEED_MAX_IMAGES = 8;
export const XML_FEED_RUN_PAGE_SIZE = 20;

export const XML_FEED_INTERVALS = [
  { value: 15, label: "15 dakika" },
  { value: 30, label: "30 dakika" },
  { value: 60, label: "1 saat" },
  { value: 180, label: "3 saat" },
  { value: 360, label: "6 saat" },
  { value: 720, label: "12 saat" },
  { value: 1440, label: "Günde 1 kez" },
] as const;

export const XML_FEED_MATCH_BY = ["BARCODE", "SKU", "PRODUCT_CODE", "PRODUCT_ID"] as const;
export type XmlFeedMatchBy = (typeof XML_FEED_MATCH_BY)[number];

export const XML_FEED_PRICE_ROUNDS = ["NONE", "INTEGER", "NINETY_NINE"] as const;
export type XmlFeedPriceRound = (typeof XML_FEED_PRICE_ROUNDS)[number];

export const XML_FEED_RUN_STATUSES = ["QUEUED", "RUNNING", "COMPLETED", "FAILED"] as const;
export type XmlFeedRunStatus = (typeof XML_FEED_RUN_STATUSES)[number];

export const XML_FEED_OUT_OF_STOCK = ["DENY", "ALLOW", "DEFAULT"] as const;
export type XmlFeedOutOfStockBehavior = (typeof XML_FEED_OUT_OF_STOCK)[number];

export function isXmlFeedOutOfStockBehavior(value: string): value is XmlFeedOutOfStockBehavior {
  return (XML_FEED_OUT_OF_STOCK as readonly string[]).includes(value);
}

export function xmlFeedOutOfStockLabel(value: XmlFeedOutOfStockBehavior) {
  switch (value) {
    case "DENY":
      return "Siparişe izin verme";
    case "ALLOW":
      return "Siparişe izin ver (ön sipariş)";
    case "DEFAULT":
      return "Varsayılan davranış";
    default: {
      const _exhaustive: never = value;
      return _exhaustive;
    }
  }
}

export function parseXmlFeedStockLimit(value: unknown) {
  const raw = typeof value === "number" ? value : Number(String(value ?? "").replace(",", "."));
  if (!Number.isFinite(raw) || raw < 0) return 0;
  return Math.min(1_000_000, Math.floor(raw));
}

export function xmlFeedClosesForLowStock(
  stock: number | null,
  limit: number,
  behavior: XmlFeedOutOfStockBehavior,
) {
  if (limit <= 0) return false;
  const qty = stock == null ? 0 : stock;
  if (qty >= limit) return false;
  switch (behavior) {
    case "ALLOW":
      return false;
    case "DENY":
    case "DEFAULT":
      return true;
    default: {
      const _exhaustive: never = behavior;
      return _exhaustive;
    }
  }
}

export type XmlFeedCatalogFlags = {
  closeAllForSale: boolean;
  closeZeroStock: boolean;
  deleteUnsold: boolean;
};

export function parseXmlFeedCatalogFlags(record: Record<string, unknown>): XmlFeedCatalogFlags {
  return {
    closeAllForSale: record.closeAllForSale === true,
    closeZeroStock: record.closeZeroStock === true,
    deleteUnsold: record.deleteUnsold === true,
  };
}

export function parseFeedSaleStatus(raw: string | undefined): boolean | null {
  const value = (raw ?? "").trim().split(/\s*\|\s*/)[0]?.trim().toLocaleLowerCase("tr-TR") ?? "";
  if (!value) return null;
  switch (value) {
    case "active":
    case "aktif":
    case "açık":
    case "acik":
    case "open":
    case "true":
    case "1":
    case "yes":
    case "evet":
    case "enabled":
    case "enable":
    case "published":
    case "online":
    case "live":
    case "available":
    case "on":
    case "sale":
      return true;
    case "inactive":
    case "pasif":
    case "kapalı":
    case "kapali":
    case "closed":
    case "close":
    case "false":
    case "0":
    case "no":
    case "hayır":
    case "hayir":
    case "disabled":
    case "disable":
    case "draft":
    case "unpublished":
    case "offline":
    case "archived":
    case "deleted":
    case "hidden":
    case "pending":
    case "discontinued":
    case "off":
    case "passive":
      return false;
    default:
      return false;
  }
}

export function xmlFeedShouldCloseForSale(
  stock: number | null,
  flags: XmlFeedCatalogFlags & { stockLimit: number; outOfStockBehavior: XmlFeedOutOfStockBehavior },
) {
  return xmlFeedSaleCloseReasons(stock, flags).length > 0;
}

export function xmlFeedSaleCloseReasons(
  stock: number | null,
  flags: XmlFeedCatalogFlags & { stockLimit: number; outOfStockBehavior: XmlFeedOutOfStockBehavior },
): FeedSaleCloseReason[] {
  const reasons: FeedSaleCloseReason[] = [];
  if (flags.closeAllForSale) reasons.push("close_all");
  if (xmlFeedClosesForLowStock(stock, flags.stockLimit, flags.outOfStockBehavior)) {
    reasons.push("stock_limit");
  }
  if (!flags.closeZeroStock) return reasons;
  if (stock == null) return reasons;
  if (stock > 0) return reasons;
  switch (flags.outOfStockBehavior) {
    case "ALLOW":
      return reasons;
    case "DENY":
    case "DEFAULT":
      reasons.push("zero_stock");
      return reasons;
    default: {
      const _exhaustive: never = flags.outOfStockBehavior;
      return _exhaustive;
    }
  }
}

export const XML_FEED_TARGET_FIELDS = [
  { key: "title", header: "Ürün adı", group: "kimlik", hint: "Yeni üründe zorunlu" },
  { key: "barcode", header: "Barkod", group: "kimlik", hint: "Eşleme için önerilir" },
  { key: "sku", header: "SKU", group: "kimlik", hint: "Tedarikçi stok kodu" },
  { key: "externalId", header: "Ürün ID", group: "kimlik", hint: "XML product_Id. Eşleme anahtarı için önerilir" },
  { key: "productKey", header: "Ürün kodu", group: "kimlik", hint: "Ürün seviyesinde kod" },
  { key: "price", header: "Satış fiyatı", group: "fiyat", hint: "Normal satış. Güncelleme açıkken boş veya 0 gelirse ürün satışa kapanır" },
  { key: "discount", header: "İndirimli satış fiyatı", group: "fiyat", hint: "Doluysa müşteri bunu öder; satış fiyatı sitede üstü çizili görünür" },
  { key: "compareAt", header: "Liste / eski fiyat", group: "fiyat", hint: "Eski kalıp. İndirimli satış bağlıysa gerekmez" },
  { key: "cost", header: "Alış fiyatı", group: "fiyat", hint: "Maliyet. Boşsa mevcut değer korunur; sitede görünmez" },
  { key: "taxRate", header: "KDV (%)", group: "fiyat", hint: "Boşsa mevcut KDV korunur" },
  { key: "stock", header: "Stok", group: "stok", hint: "Sayı veya in stock / out of stock" },
  {
    key: "availableForOrder",
    header: "Satış durumu",
    group: "stok",
    hint: "API/XML açık-kapalı değeri. active, açık, 1 → satışa açık; inactive, kapalı, 0 → satışa kapalı.",
  },
  { key: "category", header: "Kategori", group: "sınıflama", hint: "Eşlenmezse ürün çekilmez. Kaynakta kategori yoksa varsayılan kullanılır" },
  { key: "brand", header: "Marka", group: "sınıflama", hint: "Eşlenmezse ürün çekilmez. Kaynakta marka yoksa boş kalabilir" },
  { key: "supplier", header: "Tedarikçi", group: "sınıflama", hint: "Boşsa kaynak tedarikçisi" },
  { key: "filters", header: "Filtreler", group: "sınıflama", hint: "Eşlenen ürün filtrelerini yaz. Kapalıysa yalnızca yeni üründe uygulanır" },
  { key: "summary", header: "Kısa açıklama", group: "içerik", hint: "" },
  { key: "content", header: "Açıklama", group: "içerik", hint: "HTML olabilir" },
  { key: "imageUrl", header: "Görseller", group: "içerik", hint: "Güncelleme açıkken XML’de görsel yoksa satışa kapanır. İndirme başarısız olursa mevcut görseller korunur." },
  { key: "option1Name", header: "Özellik 1 adı", group: "varyant", hint: "Örn. Beden. Boşsa varyant dizisinden otomatik bulunur" },
  { key: "option1Value", header: "Özellik 1 değeri", group: "varyant", hint: "Örn. 38 / S" },
  { key: "option2Name", header: "Özellik 2 adı", group: "varyant", hint: "Örn. Renk" },
  { key: "option2Value", header: "Özellik 2 değeri", group: "varyant", hint: "Örn. Siyah" },
  { key: "option3Name", header: "Özellik 3 adı", group: "varyant", hint: "İsteğe bağlı üçüncü özellik" },
  { key: "option3Value", header: "Özellik 3 değeri", group: "varyant", hint: "" },
  { key: "mpn", header: "MPN", group: "kimlik", hint: "" },
  { key: "gtin", header: "GTIN", group: "kimlik", hint: "" },
  { key: "upc", header: "UPC", group: "kimlik", hint: "" },
  { key: "weightKg", header: "Ağırlık (kg)", group: "lojistik", hint: "" },
  { key: "widthCm", header: "En (cm)", group: "lojistik", hint: "" },
  { key: "heightCm", header: "Boy (cm)", group: "lojistik", hint: "" },
  { key: "depthCm", header: "Yükseklik (cm)", group: "lojistik", hint: "" },
  { key: "seoTitle", header: "SEO başlık", group: "içerik", hint: "" },
  { key: "seoDescription", header: "SEO açıklama", group: "içerik", hint: "" },
] as const;

export type XmlFeedTargetKey = (typeof XML_FEED_TARGET_FIELDS)[number]["key"];

const XML_FEED_FILTER_PREFIX = "filter:";

export type XmlFeedFilterTargetKey = `${typeof XML_FEED_FILTER_PREFIX}${string}`;
export type XmlFeedMappedField = XmlFeedTargetKey | XmlFeedFilterTargetKey;

/** XML yolu → mağaza alanı. Aynı alana birden fazla XML etiketi bağlanabilir (görseller ve filtreler). */
export type XmlFeedFieldMapping = Record<string, XmlFeedMappedField>;

export type XmlFeedFilterCatalogItem = {
  id: string;
  name: string;
  slug: string;
  inputType: "MULTI_SELECT" | "SWATCH" | "BOOLEAN" | "RANGE";
  unit: string | null;
  values: Array<{ id: string; name: string; slug?: string }>;
};

const TARGET_KEY_SET = new Set<string>(XML_FEED_TARGET_FIELDS.map((field) => field.key));

export function isXmlFeedTargetKey(value: string): value is XmlFeedTargetKey {
  return TARGET_KEY_SET.has(value);
}

export function isXmlFeedFilterTargetKey(value: string): value is XmlFeedFilterTargetKey {
  return value.startsWith(XML_FEED_FILTER_PREFIX) && value.length > XML_FEED_FILTER_PREFIX.length;
}

export function isXmlFeedMappedField(value: string): value is XmlFeedMappedField {
  return isXmlFeedTargetKey(value) || isXmlFeedFilterTargetKey(value);
}

export function xmlFeedFilterTargetKey(filterId: string): XmlFeedFilterTargetKey {
  return `${XML_FEED_FILTER_PREFIX}${filterId.trim()}`;
}

export function xmlFeedFilterIdFromTarget(value: string) {
  if (!isXmlFeedFilterTargetKey(value)) return null;
  const id = value.slice(XML_FEED_FILTER_PREFIX.length).trim();
  return id || null;
}

export function xmlFeedTargetLabel(key: XmlFeedTargetKey) {
  return XML_FEED_TARGET_FIELDS.find((field) => field.key === key)?.header ?? key;
}

export function xmlFeedMappedFieldLabel(key: XmlFeedMappedField, filters: XmlFeedFilterCatalogItem[] = []) {
  if (isXmlFeedTargetKey(key)) return xmlFeedTargetLabel(key);
  const filterId = xmlFeedFilterIdFromTarget(key);
  const filter = filters.find((item) => item.id === filterId);
  return filter ? `Filtre: ${filter.name}` : "Filtre";
}

export function mappingHasTarget(mapping: XmlFeedFieldMapping, field: XmlFeedTargetKey) {
  return Object.values(mapping).includes(field);
}

export function mappingFilterIds(mapping: XmlFeedFieldMapping) {
  const ids: string[] = [];
  for (const field of Object.values(mapping)) {
    const filterId = xmlFeedFilterIdFromTarget(field);
    if (filterId && !ids.includes(filterId)) ids.push(filterId);
  }
  return ids;
}

export function isFeedPathUnder(path: string, prefix: string) {
  const head = prefix.trim();
  if (!head) return false;
  return path === head || path.startsWith(`${head}.`);
}

export function splitFeedTagsByVariant<T extends { path: string }>(tags: T[], variantPath: string) {
  const head = variantPath.trim();
  if (!head) return { product: tags, variant: [] as T[] };
  const product: T[] = [];
  const variant: T[] = [];
  for (const tag of tags) {
    if (tag.path === head) continue;
    if (isFeedPathUnder(tag.path, head)) variant.push(tag);
    else product.push(tag);
  }
  return { product, variant };
}

export type XmlFeedCategoryAlias = {
  from: string;
  to: string;
};

export type XmlFeedFormValues = {
  id?: string;
  name: string;
  url: string;
  isActive: boolean;
  supplierId: string;
  defaultCategoryId: string;
  defaultBrandId: string;
  itemPath: string;
  variantPath: string;
  mapping: XmlFeedFieldMapping;
  categoryAliases: XmlFeedCategoryAlias[];
  brandAliases: XmlFeedCategoryAlias[];
  filterValueAliases: Record<string, XmlFeedCategoryAlias[]>;
  discovery: XmlFeedDiscovery | null;
  lastSyncWarnings: FeedSyncWarningReport | null;
  matchBy: XmlFeedMatchBy;
  skuPrefix: string;
  httpUser: string;
  httpPass: string;
  createNew: boolean;
  updateFields: XmlFeedTargetKey[];
  updatePrice: boolean;
  updateStock: boolean;
  updateImages: boolean;
  updateContent: boolean;
  updateTitle: boolean;
  deactivateMissing: boolean;
  stockLimit: number;
  outOfStockBehavior: XmlFeedOutOfStockBehavior;
  closeAllForSale: boolean;
  closeZeroStock: boolean;
  deleteUnsold: boolean;
  priceIncludesTax: boolean;
  priceMarkupPercent: string;
  priceRound: XmlFeedPriceRound;
  intervalMinutes: number;
};

export type XmlProductFeedRunSummary = {
  id: string;
  status: XmlFeedRunStatus;
  itemCount: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  deactivatedCount: number;
  cursor: number;
  message: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
};

export type XmlProductFeedSummary = {
  id: string;
  name: string;
  url: string;
  isActive: boolean;
  supplierId: string | null;
  supplierName: string | null;
  defaultCategoryId: string | null;
  defaultBrandId: string | null;
  itemPath: string;
  variantPath: string;
  mapping: XmlFeedFieldMapping;
  categoryAliases: XmlFeedCategoryAlias[];
  brandAliases: XmlFeedCategoryAlias[];
  filterValueAliases: Record<string, XmlFeedCategoryAlias[]>;
  discovery: XmlFeedDiscovery | null;
  lastSyncWarnings: FeedSyncWarningReport | null;
  matchBy: XmlFeedMatchBy;
  skuPrefix: string;
  httpUser: string | null;
  hasHttpPass: boolean;
  createNew: boolean;
  updateFields: XmlFeedTargetKey[];
  updatePrice: boolean;
  updateStock: boolean;
  updateImages: boolean;
  updateContent: boolean;
  updateTitle: boolean;
  deactivateMissing: boolean;
  stockLimit: number;
  outOfStockBehavior: XmlFeedOutOfStockBehavior;
  closeAllForSale: boolean;
  closeZeroStock: boolean;
  deleteUnsold: boolean;
  priceIncludesTax: boolean;
  priceMarkupPercent: string;
  priceRound: XmlFeedPriceRound;
  intervalMinutes: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
  lastStatus: string | null;
  lastMessage: string | null;
  lastCreatedCount: number;
  lastUpdatedCount: number;
  lastSkippedCount: number;
  lastFailedCount: number;
  running: boolean;
  runningCursor: number;
  runningItemCount: number;
  recentRuns: XmlProductFeedRunSummary[];
};

export type XmlFeedLiveProgress = {
  id: string;
  running: boolean;
  lastStatus: string | null;
  lastMessage: string | null;
  lastCreatedCount: number;
  lastUpdatedCount: number;
  lastSkippedCount: number;
  lastFailedCount: number;
  runningCursor: number;
  runningItemCount: number;
  lastSyncWarnings: FeedSyncWarningReport | null;
  warningCount: number;
};

export type XmlFeedLookupOption = {
  id: string;
  name: string;
  depth?: number;
};

export type XmlPreviewMappedRow = {
  rowNumber: number;
  title: string;
  barcode: string;
  sku: string;
  price: string;
  discount: string;
  stock: string;
  category: string;
  brand: string;
  imageCount: number;
  variantLabel: string;
};

export type XmlFeedTagPreview = {
  path: string;
  sample: string;
};

export type XmlFeedPreviewResult = {
  itemPath: string;
  variantPath: string;
  variantPathCandidates: string[];
  itemCount: number;
  variantRowCount: number;
  xmlPaths: string[];
  xmlTags: XmlFeedTagPreview[];
  suggestedMapping: XmlFeedFieldMapping;
  xmlCategories: string[];
  xmlBrands: string[];
  xmlFilterValues: Record<string, string[]>;
  sampleRows: XmlPreviewMappedRow[];
};

export type XmlFeedDiscovery = {
  itemPath: string;
  variantPath: string;
  itemCount: number;
  xmlTags: XmlFeedTagPreview[];
  xmlCategories: string[];
  xmlBrands: string[];
  xmlFilterValues: Record<string, string[]>;
  sampleRows: XmlPreviewMappedRow[];
};

export function discoveryFromPreview(preview: XmlFeedPreviewResult): XmlFeedDiscovery {
  return {
    itemPath: preview.itemPath,
    variantPath: preview.variantPath,
    itemCount: preview.itemCount,
    xmlTags: preview.xmlTags,
    xmlCategories: preview.xmlCategories,
    xmlBrands: preview.xmlBrands,
    xmlFilterValues: preview.xmlFilterValues,
    sampleRows: preview.sampleRows,
  };
}

export function previewFromDiscovery(
  discovery: XmlFeedDiscovery,
  mapping: XmlFeedFieldMapping = {},
): XmlFeedPreviewResult {
  return {
    itemPath: discovery.itemPath,
    variantPath: discovery.variantPath,
    variantPathCandidates: discovery.variantPath ? [discovery.variantPath] : [],
    itemCount: discovery.itemCount,
    variantRowCount: discovery.sampleRows.reduce(
      (sum, row) => sum + (row.variantLabel ? 1 : 0),
      discovery.itemCount,
    ),
    xmlPaths: discovery.xmlTags.map((tag) => tag.path),
    xmlTags: discovery.xmlTags,
    suggestedMapping: mapping,
    xmlCategories: discovery.xmlCategories,
    xmlBrands: discovery.xmlBrands,
    xmlFilterValues: discovery.xmlFilterValues ?? {},
    sampleRows: discovery.sampleRows,
  };
}

export function emptyXmlFeedForm(): XmlFeedFormValues {
  return {
    name: "",
    url: "",
    isActive: true,
    supplierId: "",
    defaultCategoryId: "",
    defaultBrandId: "",
    itemPath: "",
    variantPath: "",
    mapping: {},
    categoryAliases: [],
    brandAliases: [],
    filterValueAliases: {},
    discovery: null,
    lastSyncWarnings: null,
    matchBy: "BARCODE",
    skuPrefix: "",
    httpUser: "",
    httpPass: "",
    createNew: true,
    updateFields: ["price", "stock", "filters"],
    updatePrice: true,
    updateStock: true,
    updateImages: false,
    updateContent: false,
    updateTitle: false,
    deactivateMissing: false,
    stockLimit: 0,
    outOfStockBehavior: "DENY",
    closeAllForSale: false,
    closeZeroStock: false,
    deleteUnsold: false,
    priceIncludesTax: true,
    priceMarkupPercent: "0",
    priceRound: "NONE",
    intervalMinutes: 60,
  };
}

export function isXmlFeedMatchBy(value: string): value is XmlFeedMatchBy {
  return (XML_FEED_MATCH_BY as readonly string[]).includes(value);
}

export function isXmlFeedPriceRound(value: string): value is XmlFeedPriceRound {
  return (XML_FEED_PRICE_ROUNDS as readonly string[]).includes(value);
}

export function isXmlFeedRunStatus(value: string): value is XmlFeedRunStatus {
  return (XML_FEED_RUN_STATUSES as readonly string[]).includes(value);
}

export function xmlFeedMatchByLabel(value: XmlFeedMatchBy) {
  switch (value) {
    case "BARCODE":
      return "Barkod";
    case "SKU":
      return "SKU";
    case "PRODUCT_CODE":
      return "Ürün kodu";
    case "PRODUCT_ID":
      return "XML ürün ID";
    default: {
      const _exhaustive: never = value;
      return _exhaustive;
    }
  }
}

export function xmlFeedPriceRoundLabel(value: XmlFeedPriceRound) {
  switch (value) {
    case "NONE":
      return "Yuvarlama yok";
    case "INTEGER":
      return "Tam sayı";
    case "NINETY_NINE":
      return "x,99";
    default: {
      const _exhaustive: never = value;
      return _exhaustive;
    }
  }
}

export function xmlFeedRunStatusLabel(value: XmlFeedRunStatus) {
  switch (value) {
    case "QUEUED":
      return "Sırada";
    case "RUNNING":
      return "Çalışıyor";
    case "COMPLETED":
      return "Tamamlandı";
    case "FAILED":
      return "Hata";
    default: {
      const _exhaustive: never = value;
      return _exhaustive;
    }
  }
}

export function xmlFeedIntervalLabel(minutes: number) {
  const known = XML_FEED_INTERVALS.find((item) => item.value === minutes);
  if (known) return known.label;
  if (minutes < 60) return `${minutes} dakika`;
  if (minutes % 60 === 0) return `${minutes / 60} saat`;
  return `${minutes} dakika`;
}

export function parseXmlFeedMapping(raw: string): XmlFeedFieldMapping {
  try {
    const parsed: unknown = JSON.parse(raw || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const record = parsed as Record<string, unknown>;
    const asSource: XmlFeedFieldMapping = {};
    const asLegacy: XmlFeedFieldMapping = {};
    for (const [key, value] of Object.entries(record)) {
      if (typeof value !== "string" || !value.trim()) continue;
      if (isXmlFeedMappedField(value)) {
        asSource[key.trim()] = value;
      }
      if (isXmlFeedTargetKey(key) && !isXmlFeedMappedField(value)) {
        asLegacy[value.trim()] = key;
      }
    }
    return Object.keys(asSource).length >= Object.keys(asLegacy).length ? asSource : asLegacy;
  } catch {
    return {};
  }
}

function parseAliasBlock(value: unknown): XmlFeedCategoryAlias[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is XmlFeedCategoryAlias => {
        return Boolean(
          item &&
            typeof item === "object" &&
            typeof (item as XmlFeedCategoryAlias).from === "string" &&
            typeof (item as XmlFeedCategoryAlias).to === "string",
        );
      })
      .map((item) => ({ from: item.from.trim(), to: item.to.trim() }))
      .filter((item) => item.from && item.to);
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => typeof item === "string" && item.trim())
      .map(([from, item]) => ({ from: from.trim(), to: String(item).trim() }))
      .filter((item) => item.from && item.to);
  }
  return [];
}

function parseFilterValueMap(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string[]> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    const id = key.trim();
    if (!id) continue;
    if (!Array.isArray(item)) continue;
    out[id] = item.filter((entry): entry is string => typeof entry === "string" && Boolean(entry.trim()));
  }
  return out;
}

function parseFilterValueAliases(value: unknown): Record<string, XmlFeedCategoryAlias[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, XmlFeedCategoryAlias[]> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    const id = key.trim();
    if (!id) continue;
    const aliases = parseAliasBlock(item);
    if (aliases.length > 0) out[id] = aliases;
  }
  return out;
}

export const XML_FEED_DEFAULT_UPDATE_FIELDS: XmlFeedTargetKey[] = ["price", "stock", "filters"];

export function parseXmlFeedUpdateFields(value: unknown): XmlFeedTargetKey[] | null {
  if (!Array.isArray(value)) return null;
  const fields = value.filter((item): item is XmlFeedTargetKey => typeof item === "string" && isXmlFeedTargetKey(item));
  return [...new Set(fields)];
}

export function updateFieldsFromFlags(flags: {
  updatePrice: boolean;
  updateStock: boolean;
  updateImages: boolean;
  updateContent: boolean;
  updateTitle: boolean;
}): XmlFeedTargetKey[] {
  const fields: XmlFeedTargetKey[] = [];
  if (flags.updatePrice) fields.push("price", "discount", "compareAt", "cost");
  if (flags.updateStock) fields.push("stock");
  if (flags.updateImages) fields.push("imageUrl");
  if (flags.updateContent) fields.push("content");
  if (flags.updateTitle) fields.push("title");
  return fields;
}

export function flagsFromUpdateFields(fields: XmlFeedTargetKey[]) {
  return {
    updatePrice:
      fields.includes("price") ||
      fields.includes("discount") ||
      fields.includes("compareAt") ||
      fields.includes("cost"),
    updateStock: fields.includes("stock"),
    updateImages: fields.includes("imageUrl"),
    updateContent: fields.includes("content") || fields.includes("summary"),
    updateTitle: fields.includes("title"),
  };
}

export function toggleUpdateField(fields: XmlFeedTargetKey[], key: XmlFeedTargetKey, enabled: boolean) {
  if (enabled) return fields.includes(key) ? fields : [...fields, key];
  return fields.filter((item) => item !== key);
}

function parseDiscovery(value: unknown): XmlFeedDiscovery | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const tags = Array.isArray(record.xmlTags)
    ? record.xmlTags
        .filter((item): item is XmlFeedTagPreview => {
          return Boolean(
            item &&
              typeof item === "object" &&
              typeof (item as XmlFeedTagPreview).path === "string",
          );
        })
        .map((item) => ({
          path: item.path,
          sample: typeof item.sample === "string" ? item.sample : "",
        }))
    : [];
  return {
    itemPath: typeof record.itemPath === "string" ? record.itemPath : "",
    variantPath: typeof record.variantPath === "string" ? record.variantPath : "",
    itemCount: typeof record.itemCount === "number" ? record.itemCount : 0,
    xmlTags: tags,
    xmlCategories: Array.isArray(record.xmlCategories)
      ? record.xmlCategories.filter((item): item is string => typeof item === "string")
      : [],
    xmlBrands: Array.isArray(record.xmlBrands)
      ? record.xmlBrands.filter((item): item is string => typeof item === "string")
      : [],
    xmlFilterValues: parseFilterValueMap(record.xmlFilterValues),
    sampleRows: Array.isArray(record.sampleRows)
      ? (record.sampleRows as XmlPreviewMappedRow[]).map((row) => ({
          ...row,
          discount: typeof row.discount === "string" ? row.discount : "",
          variantLabel: typeof row.variantLabel === "string" ? row.variantLabel : "",
        }))
      : [],
  };
}

export function parseXmlFeedValueMaps(raw: string): {
  categories: XmlFeedCategoryAlias[];
  brands: XmlFeedCategoryAlias[];
  filterValueAliases: Record<string, XmlFeedCategoryAlias[]>;
  updateFields: XmlFeedTargetKey[] | null;
  discovery: XmlFeedDiscovery | null;
  lastSyncWarnings: FeedSyncWarningReport | null;
  variantPath: string;
  stockLimit: number;
  outOfStockBehavior: XmlFeedOutOfStockBehavior;
  closeAllForSale: boolean;
  closeZeroStock: boolean;
  deleteUnsold: boolean;
} {
  const empty = {
    categories: [] as XmlFeedCategoryAlias[],
    brands: [] as XmlFeedCategoryAlias[],
    filterValueAliases: {} as Record<string, XmlFeedCategoryAlias[]>,
    updateFields: null as XmlFeedTargetKey[] | null,
    discovery: null as XmlFeedDiscovery | null,
    lastSyncWarnings: null as FeedSyncWarningReport | null,
    variantPath: "",
    stockLimit: 0,
    outOfStockBehavior: "DENY" as XmlFeedOutOfStockBehavior,
    closeAllForSale: false,
    closeZeroStock: false,
    deleteUnsold: false,
  };
  try {
    const parsed: unknown = JSON.parse(raw || "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const record = parsed as Record<string, unknown>;
      const stockLimit = parseXmlFeedStockLimit(record.stockLimit);
      const rawBehavior = String(record.outOfStockBehavior ?? "");
      const outOfStockBehavior = isXmlFeedOutOfStockBehavior(rawBehavior)
        ? rawBehavior
        : empty.outOfStockBehavior;
      const catalogFlags = parseXmlFeedCatalogFlags(record);
      if (
        "categories" in record ||
        "brands" in record ||
        "updateFields" in record ||
        "discovery" in record ||
        "variantPath" in record ||
        "stockLimit" in record ||
        "outOfStockBehavior" in record ||
        "closeAllForSale" in record ||
        "closeZeroStock" in record ||
        "deleteUnsold" in record
      ) {
        return {
          categories: parseAliasBlock(record.categories),
          brands: parseAliasBlock(record.brands),
          filterValueAliases: parseFilterValueAliases(record.filterValueAliases),
          updateFields: parseXmlFeedUpdateFields(record.updateFields),
          discovery: parseDiscovery(record.discovery),
          lastSyncWarnings: parseFeedSyncWarningReport(record.lastSyncWarnings),
          variantPath: typeof record.variantPath === "string" ? record.variantPath : "",
          stockLimit,
          outOfStockBehavior,
          ...catalogFlags,
        };
      }
    }
    return { ...empty, categories: parseAliasBlock(parsed) };
  } catch {
    return empty;
  }
}

export function parseXmlFeedCategoryAliases(raw: string): XmlFeedCategoryAlias[] {
  return parseXmlFeedValueMaps(raw).categories;
}

export function serializeXmlFeedMapping(mapping: XmlFeedFieldMapping) {
  const clean: XmlFeedFieldMapping = {};
  for (const [path, field] of Object.entries(mapping)) {
    const xmlPath = path.trim();
    if (xmlPath && isXmlFeedMappedField(field)) clean[xmlPath] = field;
  }
  return JSON.stringify(clean);
}

function aliasesToRecord(aliases: XmlFeedCategoryAlias[]) {
  const record: Record<string, string> = {};
  for (const alias of aliases) {
    const from = alias.from.trim();
    const to = alias.to.trim();
    if (from && to) record[from] = to;
  }
  return record;
}

export function serializeXmlFeedCategoryAliases(aliases: XmlFeedCategoryAlias[]) {
  return JSON.stringify(aliasesToRecord(aliases));
}

export function serializeXmlFeedValueMaps(
  categories: XmlFeedCategoryAlias[],
  brands: XmlFeedCategoryAlias[],
  updateFields: XmlFeedTargetKey[] = XML_FEED_DEFAULT_UPDATE_FIELDS,
  discovery: XmlFeedDiscovery | null = null,
  stockLimit = 0,
  outOfStockBehavior: XmlFeedOutOfStockBehavior = "DENY",
  catalogFlags: XmlFeedCatalogFlags = {
    closeAllForSale: false,
    closeZeroStock: false,
    deleteUnsold: false,
  },
  variantPath = "",
  filterValueAliases: Record<string, XmlFeedCategoryAlias[]> = {},
  lastSyncWarnings: FeedSyncWarningReport | null = null,
) {
  const filterAliases: Record<string, Record<string, string>> = {};
  for (const [filterId, aliases] of Object.entries(filterValueAliases)) {
    const id = filterId.trim();
    if (!id) continue;
    filterAliases[id] = aliasesToRecord(aliases);
  }
  return JSON.stringify({
    categories: aliasesToRecord(categories),
    brands: aliasesToRecord(brands),
    filterValueAliases: filterAliases,
    updateFields,
    discovery,
    stockLimit: parseXmlFeedStockLimit(stockLimit),
    outOfStockBehavior: isXmlFeedOutOfStockBehavior(outOfStockBehavior) ? outOfStockBehavior : "DENY",
    closeAllForSale: catalogFlags.closeAllForSale === true,
    closeZeroStock: catalogFlags.closeZeroStock === true,
    deleteUnsold: catalogFlags.deleteUnsold === true,
    variantPath: variantPath.trim().slice(0, 500),
    ...(lastSyncWarnings && lastSyncWarnings.items.length > 0 ? { lastSyncWarnings } : {}),
  });
}

function sameLookupLabel(left: string, right: string) {
  return left.trim().toLocaleLowerCase("tr-TR") === right.trim().toLocaleLowerCase("tr-TR");
}

function categoryLeaf(value: string) {
  const parts = value.split(">").map((part) => part.trim()).filter(Boolean);
  return parts.at(-1) ?? value.trim();
}

export function suggestValueAlias(from: string, options: Array<{ name: string }>) {
  const candidates = [from.trim(), categoryLeaf(from)];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const match = options.find(
      (option) =>
        sameLookupLabel(option.name, candidate) || slugify(option.name) === slugify(candidate),
    );
    if (match) return match.name;
  }
  const folded = slugify(from);
  if (!folded) return "";
  const loose = options.find((option) => {
    const optionSlug = slugify(option.name);
    if (optionSlug.length < 4 || folded.length < 4) return false;
    return optionSlug.startsWith(folded) || folded.startsWith(optionSlug);
  });
  return loose?.name ?? "";
}

export function mergeFilterValueAliases(
  existing: Record<string, XmlFeedCategoryAlias[]>,
  xmlFilterValues: Record<string, string[]>,
  filters: XmlFeedFilterCatalogItem[],
): Record<string, XmlFeedCategoryAlias[]> {
  const next: Record<string, XmlFeedCategoryAlias[]> = { ...existing };
  const ids = new Set([
    ...filters.map((filter) => filter.id),
    ...Object.keys(existing),
    ...Object.keys(xmlFilterValues),
  ]);
  for (const filterId of ids) {
    const filter = filters.find((item) => item.id === filterId);
    const values = xmlFilterValues[filterId] ?? [];
    const current = existing[filterId] ?? [];
    if (values.length === 0 && current.length === 0) continue;
    const options =
      filter?.inputType === "BOOLEAN"
        ? [{ name: "Evet" }, { name: "Hayır" }]
        : (filter?.values ?? []);
    next[filterId] = mergeValueAliases(current, values, options);
  }
  return next;
}

export function mergeValueAliases(
  existing: XmlFeedCategoryAlias[],
  xmlValues: string[],
  options: Array<{ name: string }>,
): XmlFeedCategoryAlias[] {
  const kept = new Map(existing.map((alias) => [alias.from, alias.to]));
  const rows: XmlFeedCategoryAlias[] = [];
  const seen = new Set<string>();
  for (const from of xmlValues) {
    const key = from.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    rows.push({
      from: key,
      to: kept.get(key) || suggestValueAlias(key, options),
    });
  }
  for (const alias of existing) {
    if (!alias.from || seen.has(alias.from)) continue;
    seen.add(alias.from);
    rows.push(alias);
  }
  return rows;
}

export function upsertValueAlias(
  aliases: XmlFeedCategoryAlias[],
  from: string,
  to: string,
): XmlFeedCategoryAlias[] {
  const key = from.trim();
  const next = aliases.filter((alias) => alias.from !== key);
  if (!key) return next;
  return [...next, { from: key, to: to.trim() }];
}

export function feedToForm(feed: XmlProductFeedSummary): XmlFeedFormValues {
  return {
    ...emptyXmlFeedForm(),
    id: feed.id,
    name: feed.name,
    url: feed.url,
    isActive: feed.isActive,
    supplierId: feed.supplierId ?? "",
    defaultCategoryId: feed.defaultCategoryId ?? "",
    defaultBrandId: feed.defaultBrandId ?? "",
    itemPath: feed.itemPath,
    variantPath: feed.variantPath,
    mapping: feed.mapping,
    categoryAliases: feed.categoryAliases,
    brandAliases: feed.brandAliases,
    filterValueAliases: feed.filterValueAliases,
    discovery: feed.discovery,
    lastSyncWarnings: feed.lastSyncWarnings,
    matchBy: feed.matchBy,
    skuPrefix: feed.skuPrefix,
    httpUser: feed.httpUser ?? "",
    httpPass: "",
    createNew: feed.createNew,
    updateFields: feed.updateFields,
    updatePrice: feed.updatePrice,
    updateStock: feed.updateStock,
    updateImages: feed.updateImages,
    updateContent: feed.updateContent,
    updateTitle: feed.updateTitle,
    deactivateMissing: feed.deactivateMissing,
    stockLimit: feed.stockLimit,
    outOfStockBehavior: feed.outOfStockBehavior,
    closeAllForSale: feed.closeAllForSale,
    closeZeroStock: feed.closeZeroStock,
    deleteUnsold: feed.deleteUnsold,
    priceIncludesTax: feed.priceIncludesTax,
    priceMarkupPercent: feed.priceMarkupPercent,
    priceRound: feed.priceRound,
    intervalMinutes: feed.intervalMinutes,
  };
}

export function splitMappedFilterValues(raw: string) {
  return raw
    .split(/\s*(?:\||,|;|\/)\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function applyMappedAlias(raw: string, aliases: XmlFeedCategoryAlias[]): {
  value: string;
  rejected: boolean;
} {
  const value = raw.trim();
  if (!value) return { value: "", rejected: false };
  const exact = aliases.find((item) => item.from === value);
  if (exact) {
    const to = exact.to.trim();
    return to ? { value: to, rejected: false } : { value: "", rejected: true };
  }
  const folded = value.toLocaleLowerCase("tr-TR");
  const loose = aliases.find((item) => item.from.toLocaleLowerCase("tr-TR") === folded);
  if (loose) {
    const to = loose.to.trim();
    return to ? { value: to, rejected: false } : { value: "", rejected: true };
  }
  if (value.includes(">")) {
    const leaf = value.split(">").map((part) => part.trim()).filter(Boolean).at(-1);
    if (leaf && leaf !== value) return applyMappedAlias(leaf, aliases);
  }
  return { value, rejected: false };
}

export function applyCategoryAlias(raw: string, aliases: XmlFeedCategoryAlias[]) {
  return applyMappedAlias(raw, aliases).value;
}
