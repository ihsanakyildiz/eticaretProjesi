import type {
  ProductEstimatedDelivery,
  ProductOutOfStockBehavior,
  ProductSaleUnit,
  ProductVisibility,
} from "@prisma/client";
import {
  isProductEstimatedDelivery,
  isProductOutOfStockBehavior,
  isProductSaleUnit,
  isProductVisibility,
  productEstimatedDeliveryLabel,
  productSaleUnitLabel,
  productVisibilityLabel,
} from "@/lib/product-editor";
import { parseMajorToMinor } from "@/lib/product-money";
import { prisma } from "@/lib/prisma";
import {
  buildVariantCombinationKey,
  DEFAULT_VARIANT_COMBINATION_KEY,
  formatVariantTitle,
} from "@/lib/product-variants";
import { slugify } from "@/lib/slug";

export const PRODUCT_IMPORT_MAX_ROWS = 50000;
export const PRODUCT_IMPORT_MAX_BYTES = 40 * 1024 * 1024;
export const PRODUCT_IMPORT_PAGE_SIZE = 40;

export const PRODUCT_IMPORT_COLUMNS = [
  { key: "title", header: "Ürün adı", required: true, hint: "Zorunlu" },
  { key: "category", header: "Kategori", required: true, hint: "Mevcut kategori adı veya slug" },
  { key: "slug", header: "Slug", required: false, hint: "Boşsa ürün adından üretilir" },
  { key: "sku", header: "SKU", required: false, hint: "Bu satırın varyant SKU’su" },
  { key: "productKey", header: "Ürün kodu", required: false, hint: "Aynı ürüne ait varyant satırlarını birleştirir. Renk+beden için zorunlu" },
  { key: "option1Name", header: "Özellik 1", required: false, hint: "Örn. Beden. Varyantlar menüsünde kayıtlı olmalı" },
  { key: "option1Value", header: "Özellik 1 değeri", required: false, hint: "Örn. 38" },
  { key: "option2Name", header: "Özellik 2", required: false, hint: "Örn. Renk" },
  { key: "option2Value", header: "Özellik 2 değeri", required: false, hint: "Örn. Siyah" },
  { key: "option3Name", header: "Özellik 3", required: false, hint: "İsteğe bağlı üçüncü özellik" },
  { key: "option3Value", header: "Özellik 3 değeri", required: false, hint: "" },
  { key: "brand", header: "Marka", required: false, hint: "Mevcut marka adı veya slug" },
  { key: "supplier", header: "Tedarikçi", required: false, hint: "Mevcut tedarikçi adı veya slug" },
  { key: "summary", header: "Kısa açıklama", required: false, hint: "" },
  { key: "content", header: "Açıklama", required: false, hint: "HTML olabilir" },
  { key: "price", header: "Fiyat (KDV hariç)", required: false, hint: "Boş veya 0 ise ürün yüklenir, satışa kapanır" },
  { key: "compareAt", header: "Karşılaştırma fiyatı", required: false, hint: "KDV hariç" },
  { key: "cost", header: "Maliyet", required: false, hint: "KDV hariç" },
  { key: "taxRate", header: "KDV (%)", required: false, hint: "Boşsa varsayılan oran" },
  { key: "stock", header: "Stok", required: false, hint: "Varsayılan 0" },
  { key: "barcode", header: "Barkod", required: true, hint: "Zorunlu. Barkodsuz satırlar yüklenmez" },
  { key: "mpn", header: "MPN", required: false, hint: "" },
  { key: "upc", header: "UPC", required: false, hint: "" },
  { key: "gtin", header: "GTIN", required: false, hint: "" },
  { key: "imageUrl", header: "Görsel URL", required: false, hint: "Uzak adresler sunucuya indirilir. Link açılmazsa ürün yüklenmez. İlk görsel kapak olur" },
  { key: "isActive", header: "Aktif", required: false, hint: "Evet / Hayır" },
  { key: "availableForOrder", header: "Siparişe açık", required: false, hint: "Evet / Hayır" },
  { key: "showPrice", header: "Fiyat göster", required: false, hint: "Evet / Hayır" },
  { key: "visibility", header: "Görünürlük", required: false, hint: "Her yerde, Sadece katalogda..." },
  { key: "saleUnit", header: "Satış birimi", required: false, hint: "Adet, Kilogram, Metre, Litre, Paket" },
  { key: "minOrderQty", header: "Min. sipariş", required: false, hint: "Varsayılan 1" },
  { key: "quantityStep", header: "Sipariş adımı", required: false, hint: "Varsayılan 1" },
  { key: "outOfStockBehavior", header: "Stokta kalmadığında", required: false, hint: "Siparişe izin verme / Siparişe izin ver / Varsayılan" },
  { key: "weightKg", header: "Ağırlık (kg)", required: false, hint: "" },
  { key: "widthCm", header: "En (cm)", required: false, hint: "" },
  { key: "heightCm", header: "Boy (cm)", required: false, hint: "" },
  { key: "depthCm", header: "Yükseklik (cm)", required: false, hint: "" },
  { key: "extraShipping", header: "Ek kargo ücreti", required: false, hint: "TL" },
  { key: "estimatedDelivery", header: "Tahmini teslimat", required: false, hint: "Aynı Gün Kargo, 1 - 3 Gün Arası..." },
  { key: "seoTitle", header: "SEO başlık", required: false, hint: "" },
  { key: "seoDescription", header: "SEO açıklama", required: false, hint: "En fazla 500 karakter" },
] as const;

export type ProductImportColumnKey = (typeof PRODUCT_IMPORT_COLUMNS)[number]["key"];

export type ProductImportRawRow = Partial<Record<ProductImportColumnKey, string>> & {
  rowNumber: number;
};

export type ProductImportPreviewStatus = "ready" | "zero_price" | "error";

export type ProductImportPreviewRow = {
  rowNumber: number;
  title: string;
  category: string;
  sku: string;
  barcode: string;
  price: string;
  stock: string;
  variantSummary: string;
  rowLabel: string;
  ok: boolean;
  zeroPrice: boolean;
  status: ProductImportPreviewStatus;
  errors: string[];
};

export type ProductImportFileStats = {
  fileName: string;
  fileSize: number;
  rowCount: number;
  readyCount: number;
  zeroPriceCount: number;
  errorCount: number;
  importCount: number;
};

export type ProductImportFilter = "all" | "ready" | "zero_price" | "error";

export type ProductImportJobStatus = "PREVIEW" | "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";

export type ProductImportJobSummary = ProductImportFileStats & {
  id: string;
  status: ProductImportJobStatus;
  importedCount: number;
  failedCount: number;
  currentTitle: string | null;
  currentRow: number | null;
  error: string | null;
};

export type ProductImportLookups = {
  categories: Array<{ id: string; name: string; slug: string }>;
  brands: Array<{ id: string; name: string; slug: string }>;
  suppliers: Array<{ id: string; name: string; slug: string }>;
  attributes: Array<{
    id: string;
    name: string;
    slug: string;
    values: Array<{ id: string; name: string; slug: string }>;
  }>;
  defaultTaxPercent: number;
};

export type ProductImportDraft = {
  rowNumber: number;
  title: string;
  slugInput: string;
  sku: string | null;
  categoryId: string;
  brandId: string | null;
  supplierId: string | null;
  summary: string | null;
  content: string | null;
  basePriceMinor: number;
  compareAtMinor: number | null;
  costMinor: number | null;
  taxRatePercent: number;
  stockQuantity: number;
  barcode: string | null;
  mpn: string | null;
  upc: string | null;
  gtin: string | null;
  imageUrls: string[];
  isActive: boolean;
  availableForOrder: boolean;
  showPrice: boolean;
  visibility: ProductVisibility;
  saleUnit: ProductSaleUnit;
  minOrderQty: number;
  quantityStep: number;
  outOfStockBehavior: ProductOutOfStockBehavior;
  weightKg: number | null;
  widthCm: number | null;
  heightCm: number | null;
  depthCm: number | null;
  extraShippingMinor: number;
  estimatedDelivery: ProductEstimatedDelivery | null;
  seoTitle: string | null;
  seoDescription: string | null;
  variants: ProductImportVariantDraft[];
};

export type ProductImportVariantDraft = {
  sku: string | null;
  barcode: string;
  priceMinor: number;
  compareAtMinor: number | null;
  stockQuantity: number;
  optionValues: Array<{ attributeId: string; valueName: string }>;
  imageUrl: string | null;
};

export type ProductImportUsed = {
  slugs: Set<string>;
  productSkus: Set<string>;
  variantSkus: Set<string>;
  attributeValues: Map<string, { id: string; name: string }>;
  attributeValueSort: Map<string, number>;
};

export type PreparedImportedProduct = {
  productId: string;
  product: {
    id: string;
    title: string;
    slug: string;
    summary: string | null;
    content: string | null;
    categoryId: string;
    brandId: string | null;
    supplierId: string | null;
    sku: string | null;
    mpn: string | null;
    upc: string | null;
    gtin: string | null;
    image: string | null;
    basePriceMinor: number;
    compareAtMinor: number | null;
    costMinor: number | null;
    taxRatePercent: number;
    widthCm: number | null;
    heightCm: number | null;
    depthCm: number | null;
    weightKg: number | null;
    extraShippingMinor: number;
    estimatedDelivery: ProductEstimatedDelivery | null;
    saleUnit: ProductSaleUnit;
    minOrderQty: number;
    quantityStep: number;
    visibility: ProductVisibility;
    availableForOrder: boolean;
    showPrice: boolean;
    onlineOnly: boolean;
    onSale: boolean;
    outOfStockBehavior: ProductOutOfStockBehavior;
    isActive: boolean;
    sortOrder: number;
    seoTitle: string | null;
    seoDescription: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  variants: Array<{
    id: string;
    productId: string;
    sku: string;
    barcode: string | null;
    title: string;
    priceMinor: number;
    compareAtMinor: number | null;
    stockQuantity: number;
    trackInventory: boolean;
    allowBackorder: boolean;
    isDefault: boolean;
    isActive: boolean;
    image: string | null;
    combinationKey: string;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  }>;
  selections: Array<{
    variantId: string;
    attributeId: string;
    valueId: string;
  }>;
  images: Array<{
    id: string;
    productId: string;
    url: string;
    alt: string;
    isCover: boolean;
    sortOrder: number;
  }>;
};

export type ProductImportJobRawPayload = {
  rows: ProductImportRawRow[];
  variantSummary?: string;
  rowLabel?: string;
};

const PRODUCT_LEVEL_KEYS: ProductImportColumnKey[] = [
  "title",
  "category",
  "slug",
  "productKey",
  "brand",
  "supplier",
  "summary",
  "content",
  "cost",
  "taxRate",
  "mpn",
  "upc",
  "gtin",
  "imageUrl",
  "isActive",
  "availableForOrder",
  "showPrice",
  "visibility",
  "saleUnit",
  "minOrderQty",
  "quantityStep",
  "outOfStockBehavior",
  "weightKg",
  "widthCm",
  "heightCm",
  "depthCm",
  "extraShipping",
  "estimatedDelivery",
  "seoTitle",
  "seoDescription",
  "option1Name",
  "option2Name",
  "option3Name",
];

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/g, " ")
    .replace(/[:*]+$/g, "");
}

const HEADER_ALIASES: Record<ProductImportColumnKey, string[]> = {
  title: ["ürün adı", "urun adi", "title", "name", "ürün"],
  category: ["kategori", "category"],
  slug: ["slug", "bağlantı", "baglanti"],
  sku: ["sku", "stok kodu"],
  productKey: ["ürün kodu", "urun kodu", "handle", "grup kodu", "model kodu", "product key"],
  option1Name: ["özellik 1", "ozellik 1", "option1 name", "özellik 1 adı", "attribute 1 name"],
  option1Value: ["özellik 1 değeri", "ozellik 1 degeri", "option1 value", "attribute 1 value"],
  option2Name: ["özellik 2", "ozellik 2", "option2 name", "özellik 2 adı", "attribute 2 name"],
  option2Value: ["özellik 2 değeri", "ozellik 2 degeri", "option2 value", "attribute 2 value"],
  option3Name: ["özellik 3", "ozellik 3", "option3 name", "özellik 3 adı", "attribute 3 name"],
  option3Value: ["özellik 3 değeri", "ozellik 3 degeri", "option3 value", "attribute 3 value"],
  brand: ["marka", "brand"],
  supplier: ["tedarikçi", "tedarikci", "supplier"],
  summary: ["kısa açıklama", "kisa aciklama", "summary"],
  content: ["açıklama", "aciklama", "content", "description"],
  price: ["fiyat (kdv hariç)", "fiyat", "price", "base price"],
  compareAt: ["karşılaştırma fiyatı", "karsilastirma fiyati", "compare at"],
  cost: ["maliyet", "cost"],
  taxRate: ["kdv (%)", "kdv", "tax", "tax rate"],
  stock: ["stok", "stock", "adet"],
  barcode: ["barkod", "barcode"],
  mpn: ["mpn"],
  upc: ["upc"],
  gtin: ["gtin"],
  imageUrl: ["görsel url", "gorsel url", "görseller", "gorseller", "image", "image url", "images", "görsel"],
  isActive: ["aktif", "active"],
  availableForOrder: ["siparişe açık", "siparise acik", "available"],
  showPrice: ["fiyat göster", "fiyat goster", "show price"],
  visibility: ["görünürlük", "gorunurluk", "visibility"],
  saleUnit: ["satış birimi", "satis birimi", "sale unit"],
  minOrderQty: ["min. sipariş", "min sipariş", "min order"],
  quantityStep: ["sipariş adımı", "siparis adimi", "quantity step"],
  outOfStockBehavior: ["stokta kalmadığında", "stokta kalmadiginda", "out of stock"],
  weightKg: ["ağırlık (kg)", "agirlik (kg)", "weight"],
  widthCm: ["en (cm)", "width"],
  heightCm: ["boy (cm)", "height"],
  depthCm: ["yükseklik (cm)", "yukseklik (cm)", "depth"],
  extraShipping: ["ek kargo ücreti", "ek kargo ucreti", "extra shipping"],
  estimatedDelivery: ["tahmini teslimat", "estimated delivery"],
  seoTitle: ["seo başlık", "seo baslik", "seo title"],
  seoDescription: ["seo açıklama", "seo aciklama", "seo description"],
};

export function matchImportHeader(header: string): ProductImportColumnKey | null {
  const normalized = normalizeHeader(header);
  if (!normalized) return null;
  for (const column of PRODUCT_IMPORT_COLUMNS) {
    if (normalizeHeader(column.header) === normalized) return column.key;
    if (HEADER_ALIASES[column.key].includes(normalized)) return column.key;
  }
  return null;
}

function emptyToNull(value: string | undefined, max = 191) {
  const trimmed = (value ?? "").trim().slice(0, max);
  return trimmed || null;
}

function parseOptionalDecimal(raw: string | undefined) {
  const normalized = (raw ?? "").trim().replace(",", ".");
  if (!normalized) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function parseBooleanCell(raw: string | undefined, fallback: boolean) {
  const value = (raw ?? "").trim().toLocaleLowerCase("tr-TR");
  if (!value) return fallback;
  switch (value) {
    case "evet":
    case "e":
    case "yes":
    case "true":
    case "1":
    case "on":
      return true;
    case "hayır":
    case "hayir":
    case "h":
    case "no":
    case "false":
    case "0":
    case "off":
      return false;
    default:
      return null;
  }
}

function parsePositiveInt(raw: string | undefined, fallback: number) {
  const value = Number.parseInt((raw ?? "").trim(), 10);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.min(99999, value);
}

function parseStock(raw: string | undefined) {
  const value = Number.parseInt((raw ?? "").trim(), 10);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

function resolveByNameOrSlug<T extends { id: string; name: string; slug: string }>(
  items: T[],
  raw: string,
): T | null {
  const value = raw.trim();
  if (!value) return null;
  const slug = slugify(value);
  return (
    items.find((item) => item.slug === slug) ??
    items.find((item) => item.name.toLocaleLowerCase("tr-TR") === value.toLocaleLowerCase("tr-TR")) ??
    null
  );
}

function parseVisibility(raw: string | undefined): ProductVisibility | null {
  const value = (raw ?? "").trim();
  if (!value) return "EVERYWHERE";
  if (isProductVisibility(value)) return value;
  const labels: ProductVisibility[] = ["EVERYWHERE", "CATALOG", "SEARCH", "NONE"];
  return (
    labels.find((item) => productVisibilityLabel(item).toLocaleLowerCase("tr-TR") === value.toLocaleLowerCase("tr-TR")) ??
    null
  );
}

function parseSaleUnit(raw: string | undefined): ProductSaleUnit | null {
  const value = (raw ?? "").trim();
  if (!value) return "PIECE";
  if (isProductSaleUnit(value)) return value;
  const units: ProductSaleUnit[] = ["PIECE", "KG", "METER", "LITER", "PACK"];
  return (
    units.find((item) => productSaleUnitLabel(item).toLocaleLowerCase("tr-TR") === value.toLocaleLowerCase("tr-TR")) ??
    null
  );
}

function parseOutOfStockBehavior(raw: string | undefined): ProductOutOfStockBehavior | null {
  const value = (raw ?? "").trim();
  if (!value) return "DEFAULT";
  if (isProductOutOfStockBehavior(value)) return value;
  const normalized = value.toLocaleLowerCase("tr-TR");
  if (normalized.includes("izin verme")) return "DENY";
  if (normalized.includes("izin ver")) return "ALLOW";
  if (normalized.includes("varsayılan") || normalized.includes("varsayilan")) return "DEFAULT";
  return null;
}

function parseEstimatedDelivery(raw: string | undefined): ProductEstimatedDelivery | null | undefined {
  const value = (raw ?? "").trim();
  if (!value) return null;
  if (isProductEstimatedDelivery(value)) return value;
  const options: ProductEstimatedDelivery[] = ["SAME_DAY", "DAYS_1_3", "DAYS_3_5", "DAYS_5_10"];
  return (
    options.find(
      (item) => productEstimatedDeliveryLabel(item).toLocaleLowerCase("tr-TR") === value.toLocaleLowerCase("tr-TR"),
    ) ?? undefined
  );
}

function isImportImageUrl(value: string) {
  return value.startsWith("/uploads/") || value.startsWith("https://") || value.startsWith("http://");
}

function parseImageUrls(raw: string | undefined): { urls: string[]; invalid: string[] } {
  const cleaned = (raw ?? "")
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
  if (!cleaned.trim()) return { urls: [], invalid: [] };

  const parts = cleaned
    .split(/[\n,;]+/)
    .map((item) => item.trim().replace(/^["']+|["']+$/g, "").trim())
    .filter(Boolean);

  const urls: string[] = [];
  const seen = new Set<string>();
  const addUrl = (value: string) => {
    const url = value.slice(0, 500);
    if (!isImportImageUrl(url) || seen.has(url)) return;
    seen.add(url);
    urls.push(url);
  };

  for (const part of parts) addUrl(part);

  if (urls.length === 0) {
    const matches = cleaned.match(/https?:\/\/[^\s,;]+|\/uploads\/[^\s,;]+/gi) ?? [];
    for (const match of matches) addUrl(match.replace(/[)\].,;]+$/g, ""));
  }

  const invalid = urls.length === 0 && cleaned.trim() ? [cleaned.trim()] : [];
  return { urls, invalid };
}

export async function loadProductImportLookups(): Promise<ProductImportLookups> {
  const [categories, brands, suppliers, defaultTax, attributes] = await Promise.all([
    prisma.productCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true },
    }),
    prisma.brand.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true },
    }),
    prisma.supplier.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true },
    }),
    prisma.taxRate.findFirst({
      where: { isActive: true, isDefault: true },
      select: { percent: true },
    }),
    prisma.productAttribute.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        values: {
          where: { isActive: true },
          select: { id: true, name: true, slug: true },
        },
      },
    }),
  ]);

  return {
    categories,
    brands,
    suppliers,
    attributes,
    defaultTaxPercent: defaultTax?.percent ?? 20,
  };
}

function firstCell(rows: ProductImportRawRow[], key: ProductImportColumnKey) {
  for (const row of rows) {
    const value = (row[key] ?? "").trim();
    if (value) return value;
  }
  return "";
}

function mergeBaseRow(rows: ProductImportRawRow[]): ProductImportRawRow {
  const base: ProductImportRawRow = { ...rows[0] };
  for (const key of PRODUCT_LEVEL_KEYS) {
    if ((base[key] ?? "").trim()) continue;
    const filled = firstCell(rows, key);
    if (filled) base[key] = filled;
  }
  return base;
}

function sameLabel(left: string, right: string) {
  const a = left.trim();
  const b = right.trim();
  if (!a || !b) return a === b;
  return slugify(a) === slugify(b) || a.toLocaleLowerCase("tr-TR") === b.toLocaleLowerCase("tr-TR");
}

function inheritOptionNames(rows: ProductImportRawRow[]): [string, string, string] {
  const names: [string, string, string] = ["", "", ""];
  for (const row of rows) {
    if (!names[0]) names[0] = (row.option1Name ?? "").trim();
    if (!names[1]) names[1] = (row.option2Name ?? "").trim();
    if (!names[2]) names[2] = (row.option3Name ?? "").trim();
  }
  return names;
}

function optionSlots(row: ProductImportRawRow, inherited: [string, string, string]) {
  return [
    { index: 1, name: (row.option1Name ?? "").trim() || inherited[0], value: (row.option1Value ?? "").trim() },
    { index: 2, name: (row.option2Name ?? "").trim() || inherited[1], value: (row.option2Value ?? "").trim() },
    { index: 3, name: (row.option3Name ?? "").trim() || inherited[2], value: (row.option3Value ?? "").trim() },
  ];
}

function formatRowLabel(rows: ProductImportRawRow[]) {
  const numbers = rows.map((row) => row.rowNumber);
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  return min === max ? String(min) : `${min}–${max}`;
}

function formatVariantSummary(optionNames: string[], variantCount: number) {
  if (optionNames.length === 0) return variantCount > 1 ? `${variantCount} SKU` : "Tek ürün";
  const axes = optionNames.join(" + ");
  return variantCount > 1 ? `${axes} · ${variantCount} SKU` : axes;
}

export function groupImportRawRows(rows: ProductImportRawRow[]): ProductImportRawRow[][] {
  const keyed = new Map<string, ProductImportRawRow[]>();
  for (const row of rows) {
    const key = (row.productKey ?? "").trim().toLocaleLowerCase("tr-TR");
    if (!key) continue;
    const group = keyed.get(key);
    if (group) group.push(row);
    else keyed.set(key, [row]);
  }

  const emitted = new Set<string>();
  const groups: ProductImportRawRow[][] = [];
  for (const row of rows) {
    const key = (row.productKey ?? "").trim().toLocaleLowerCase("tr-TR");
    if (!key) {
      groups.push([row]);
      continue;
    }
    if (emitted.has(key)) continue;
    emitted.add(key);
    groups.push(keyed.get(key) ?? [row]);
  }
  return groups;
}

function isJobRawPayload(value: unknown): value is ProductImportJobRawPayload {
  return Boolean(value && typeof value === "object" && Array.isArray((value as ProductImportJobRawPayload).rows));
}

export function parseJobRowRawJson(rawJson: string): ProductImportRawRow[] {
  const parsed: unknown = JSON.parse(rawJson);
  if (Array.isArray(parsed)) return parsed as ProductImportRawRow[];
  if (isJobRawPayload(parsed)) return parsed.rows;
  if (parsed && typeof parsed === "object" && "rowNumber" in parsed) {
    return [parsed as ProductImportRawRow];
  }
  throw new Error("invalid");
}

export function parseJobRowMeta(rawJson: string): { variantSummary: string; rowLabel: string } {
  try {
    const parsed: unknown = JSON.parse(rawJson);
    if (isJobRawPayload(parsed)) {
      return {
        variantSummary: parsed.variantSummary ?? "",
        rowLabel: parsed.rowLabel ?? "",
      };
    }
  } catch {
    /* eski işler */
  }
  return { variantSummary: "", rowLabel: "" };
}

function seedAttributeValueCache(lookups: ProductImportLookups): Map<string, { id: string; name: string }> {
  const cache = new Map<string, { id: string; name: string }>();
  for (const attribute of lookups.attributes) {
    for (const value of attribute.values) {
      cache.set(`${attribute.id}:${value.slug}`, { id: value.id, name: value.name });
      cache.set(`${attribute.id}:name:${value.name.toLocaleLowerCase("tr-TR")}`, {
        id: value.id,
        name: value.name,
      });
    }
  }
  return cache;
}

export function createProductImportUsed(lookups: ProductImportLookups): ProductImportUsed {
  return {
    slugs: new Set<string>(),
    productSkus: new Set<string>(),
    variantSkus: new Set<string>(),
    attributeValues: seedAttributeValueCache(lookups),
    attributeValueSort: new Map<string, number>(),
  };
}

export async function hydrateProductImportUsed(used: ProductImportUsed) {
  const [products, variants, valueSorts] = await Promise.all([
    prisma.product.findMany({ select: { slug: true, sku: true } }),
    prisma.productVariant.findMany({ select: { sku: true } }),
    prisma.productAttributeValue.groupBy({
      by: ["attributeId"],
      _max: { sortOrder: true },
    }),
  ]);
  for (const product of products) {
    used.slugs.add(product.slug);
    if (product.sku) used.productSkus.add(product.sku);
  }
  for (const variant of variants) {
    used.variantSkus.add(variant.sku);
  }
  for (const row of valueSorts) {
    used.attributeValueSort.set(row.attributeId, row._max.sortOrder ?? -1);
  }
}

export function buildImportGroup(
  rows: ProductImportRawRow[],
  lookups: ProductImportLookups,
): { draft: ProductImportDraft | null; errors: string[] } {
  const errors: string[] = [];
  if (rows.length === 0) return { draft: null, errors: ["Boş ürün grubu."] };

  const row = mergeBaseRow(rows);
  const title = (row.title ?? "").trim();
  const categoryRaw = (row.category ?? "").trim();
  if (!title) errors.push("Ürün adı zorunludur.");
  if (!categoryRaw) errors.push("Kategori zorunludur.");

  const category = categoryRaw ? resolveByNameOrSlug(lookups.categories, categoryRaw) : null;
  if (categoryRaw && !category) errors.push(`Kategori bulunamadı: ${categoryRaw}`);

  const brandRaw = (row.brand ?? "").trim();
  const brand = brandRaw ? resolveByNameOrSlug(lookups.brands, brandRaw) : null;
  if (brandRaw && !brand) errors.push(`Marka bulunamadı: ${brandRaw}`);

  const supplierRaw = (row.supplier ?? "").trim();
  const supplier = supplierRaw ? resolveByNameOrSlug(lookups.suppliers, supplierRaw) : null;
  if (supplierRaw && !supplier) errors.push(`Tedarikçi bulunamadı: ${supplierRaw}`);

  const isActive = parseBooleanCell(row.isActive, true);
  if (isActive === null) errors.push("Aktif alanı Evet veya Hayır olmalıdır.");
  const availableForOrderParsed = parseBooleanCell(row.availableForOrder, true);
  if (availableForOrderParsed === null) {
    errors.push("Siparişe açık alanı Evet veya Hayır olmalıdır.");
  }
  const showPrice = parseBooleanCell(row.showPrice, true);
  if (showPrice === null) errors.push("Fiyat göster alanı Evet veya Hayır olmalıdır.");

  const visibility = parseVisibility(row.visibility);
  if (!visibility) errors.push("Görünürlük değeri geçersiz.");
  const saleUnit = parseSaleUnit(row.saleUnit);
  if (!saleUnit) errors.push("Satış birimi geçersiz.");
  const outOfStockBehavior = parseOutOfStockBehavior(row.outOfStockBehavior);
  if (!outOfStockBehavior) errors.push("Stokta kalmadığında değeri geçersiz.");
  const estimatedDelivery = parseEstimatedDelivery(row.estimatedDelivery);
  if (estimatedDelivery === undefined) errors.push("Tahmini teslimat değeri geçersiz.");

  const gallery: string[] = [];
  const seenImages = new Set<string>();
  for (const item of rows) {
    const images = parseImageUrls(item.imageUrl);
    if (images.invalid.length > 0) {
      errors.push(`Satır ${item.rowNumber}: görsel URL http(s) veya /uploads/ ile başlamalı.`);
    }
    for (const url of images.urls) {
      if (seenImages.has(url)) continue;
      seenImages.add(url);
      gallery.push(url);
    }
  }

  const taxRaw = (row.taxRate ?? "").trim();
  const taxParsed = taxRaw ? Number.parseInt(taxRaw, 10) : lookups.defaultTaxPercent;
  if (taxRaw && (!Number.isFinite(taxParsed) || taxParsed < 0 || taxParsed > 100)) {
    errors.push("KDV 0–100 arasında bir tam sayı olmalıdır.");
  }

  const inheritedNames = inheritOptionNames(rows);
  if (inheritedNames[1] && !inheritedNames[0]) {
    errors.push("Özellik 2 kullanılıyorsa Özellik 1 adı da yazılmalıdır.");
  }
  if (inheritedNames[2] && !inheritedNames[1]) {
    errors.push("Özellik 3 kullanılıyorsa Özellik 2 adı da yazılmalıdır.");
  }

  for (const item of rows) {
    const written = [
      (item.option1Name ?? "").trim(),
      (item.option2Name ?? "").trim(),
      (item.option3Name ?? "").trim(),
    ];
    written.forEach((name, index) => {
      if (name && inheritedNames[index] && !sameLabel(name, inheritedNames[index])) {
        errors.push(
          `Satır ${item.rowNumber}: Özellik ${index + 1} adı tutarsız (${name} / ${inheritedNames[index]}).`,
        );
      }
    });
  }

  const usedNames = inheritedNames.filter(Boolean);
  const uniqueNames = new Set(usedNames.map((name) => slugify(name) || name.toLocaleLowerCase("tr-TR")));
  if (uniqueNames.size !== usedNames.length) {
    errors.push("Aynı özellik bir üründe birden fazla kez kullanılamaz.");
  }

  const resolvedAxes = usedNames.map((name) => {
    const attribute = resolveByNameOrSlug(lookups.attributes, name);
    if (!attribute) errors.push(`Özellik bulunamadı: ${name}. Önce Varyantlar menüsünden ekleyin.`);
    return attribute;
  });

  if (rows.length > 1 && usedNames.length === 0) {
    errors.push("Aynı ürün koduna sahip satırlarda Özellik 1 / değeri (ör. Beden, Renk) zorunludur.");
  }

  const variants: ProductImportVariantDraft[] = [];
  const combinationKeys = new Set<string>();
  const barcodes = new Set<string>();

  for (const item of rows) {
    const barcode = emptyToNull(item.barcode, 64);
    if (!barcode) {
      errors.push(`Satır ${item.rowNumber}: barkod zorunludur.`);
    } else if (barcodes.has(barcode)) {
      errors.push(`Satır ${item.rowNumber}: aynı üründe tekrarlayan barkod (${barcode}).`);
    } else {
      barcodes.add(barcode);
    }

    const slots = optionSlots(item, inheritedNames);
    const optionValues: ProductImportVariantDraft["optionValues"] = [];
    for (const slot of slots) {
      if (!slot.name && !slot.value) continue;
      if (!slot.name) {
        errors.push(`Satır ${item.rowNumber}: Özellik ${slot.index} adı eksik.`);
        continue;
      }
      if (!slot.value) {
        errors.push(`Satır ${item.rowNumber}: ${slot.name} değeri zorunludur.`);
        continue;
      }
      const attribute = resolveByNameOrSlug(lookups.attributes, slot.name);
      if (!attribute) continue;
      optionValues.push({ attributeId: attribute.id, valueName: slot.value.slice(0, 191) });
    }

    if (
      usedNames.length > 0 &&
      resolvedAxes.every(Boolean) &&
      optionValues.length !== usedNames.length
    ) {
      errors.push(`Satır ${item.rowNumber}: ${usedNames.join(" + ")} değerlerinin tümü yazılmalıdır.`);
    }

    if (optionValues.length > 0) {
      const combo = optionValues
        .map((option) => `${option.attributeId}:${slugify(option.valueName) || option.valueName.toLocaleLowerCase("tr-TR")}`)
        .sort()
        .join("|");
      if (combinationKeys.has(combo)) {
        errors.push(`Satır ${item.rowNumber}: aynı özellik kombinasyonu tekrarlanamaz.`);
      } else {
        combinationKeys.add(combo);
      }
    }

    const rowImages = parseImageUrls(item.imageUrl);
    variants.push({
      sku: emptyToNull(item.sku, 80),
      barcode: barcode ?? "",
      priceMinor: parseMajorToMinor(item.price ?? "") ?? 0,
      compareAtMinor: parseMajorToMinor(item.compareAt ?? ""),
      stockQuantity: parseStock(item.stock),
      optionValues,
      imageUrl: rowImages.urls[0] ?? null,
    });
  }

  const priced = variants.filter((variant) => variant.priceMinor > 0);
  const basePriceMinor = priced[0]?.priceMinor ?? variants[0]?.priceMinor ?? 0;
  const zeroPrice = variants.length > 0 && variants.every((variant) => variant.priceMinor <= 0);
  const availableForOrder = zeroPrice ? false : availableForOrderParsed === true;

  if (errors.length > 0 || !category || !visibility || !saleUnit || !outOfStockBehavior) {
    return { draft: null, errors };
  }
  if (resolvedAxes.some((item) => !item) && usedNames.length > 0) {
    return { draft: null, errors };
  }

  return {
    draft: {
      rowNumber: rows[0].rowNumber,
      title: title.slice(0, 191),
      slugInput: (row.slug ?? "").trim(),
      sku: emptyToNull(row.sku, 80) ?? emptyToNull(row.productKey, 80),
      categoryId: category.id,
      brandId: brand?.id ?? null,
      supplierId: supplier?.id ?? null,
      summary: emptyToNull(row.summary, 2000),
      content: emptyToNull(row.content, 20000),
      basePriceMinor,
      compareAtMinor: parseMajorToMinor(row.compareAt ?? ""),
      costMinor: parseMajorToMinor(row.cost ?? ""),
      taxRatePercent: Number.isFinite(taxParsed) ? Math.min(100, Math.max(0, taxParsed)) : lookups.defaultTaxPercent,
      stockQuantity: variants[0]?.stockQuantity ?? 0,
      barcode: variants[0]?.barcode || null,
      mpn: emptyToNull(row.mpn, 64),
      upc: emptyToNull(row.upc, 64),
      gtin: emptyToNull(row.gtin, 64),
      imageUrls: gallery,
      isActive: isActive === true,
      availableForOrder,
      showPrice: showPrice === true,
      visibility,
      saleUnit,
      minOrderQty: parsePositiveInt(row.minOrderQty, 1),
      quantityStep: parsePositiveInt(row.quantityStep, 1),
      outOfStockBehavior,
      weightKg: parseOptionalDecimal(row.weightKg),
      widthCm: parseOptionalDecimal(row.widthCm),
      heightCm: parseOptionalDecimal(row.heightCm),
      depthCm: parseOptionalDecimal(row.depthCm),
      extraShippingMinor: parseMajorToMinor(row.extraShipping ?? "") ?? 0,
      estimatedDelivery: estimatedDelivery ?? null,
      seoTitle: emptyToNull(row.seoTitle),
      seoDescription: emptyToNull(row.seoDescription, 500),
      variants,
    },
    errors: [],
  };
}

export function buildImportDraft(
  row: ProductImportRawRow,
  lookups: ProductImportLookups,
): { draft: ProductImportDraft | null; errors: string[] } {
  return buildImportGroup([row], lookups);
}

export function previewImportRows(
  rows: ProductImportRawRow[],
  lookups: ProductImportLookups,
): ProductImportPreviewRow[] {
  return groupImportRawRows(rows).map((group) => {
    const { draft, errors } = buildImportGroup(group, lookups);
    const optionNames = inheritOptionNames(group).filter(Boolean);
    const first = group[0];
    const priceMinor = draft?.basePriceMinor ?? parseMajorToMinor(first.price ?? "") ?? 0;
    const ok = errors.length === 0;
    const zeroPrice = ok && (draft ? draft.variants.every((variant) => variant.priceMinor <= 0) : priceMinor <= 0);
    const status: ProductImportPreviewStatus = !ok ? "error" : zeroPrice ? "zero_price" : "ready";
    const title = firstCell(group, "title");
    const category = firstCell(group, "category");
    return {
      rowNumber: first.rowNumber,
      title,
      category,
      sku: firstCell(group, "sku") || firstCell(group, "productKey"),
      barcode: firstCell(group, "barcode"),
      price: firstCell(group, "price") || (zeroPrice ? "0" : ""),
      stock: String(group.reduce((sum, item) => sum + parseStock(item.stock), 0)),
      variantSummary: formatVariantSummary(optionNames, group.length),
      rowLabel: formatRowLabel(group),
      ok,
      zeroPrice,
      status,
      errors,
    };
  });
}

export function summarizeImportPreview(
  rows: ProductImportPreviewRow[],
  file: { name: string; size: number },
): ProductImportFileStats {
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const zeroPriceCount = rows.filter((row) => row.status === "zero_price").length;
  const errorCount = rows.filter((row) => row.status === "error").length;
  return {
    fileName: file.name,
    fileSize: file.size,
    rowCount: rows.length,
    readyCount,
    zeroPriceCount,
    errorCount,
    importCount: readyCount + zeroPriceCount,
  };
}

function newRecordId() {
  return crypto.randomUUID();
}

function nextUniqueLabel(base: string, used: Set<string>, maxLen = 80) {
  const root = (base.trim() || "deger").slice(0, Math.max(8, maxLen - 10));
  let candidate = root.slice(0, maxLen);
  let i = 2;
  while (used.has(candidate)) {
    candidate = `${root}-${i}`.slice(0, maxLen);
    i += 1;
  }
  used.add(candidate);
  return candidate;
}

function resolveCachedAttributeValue(
  attributeId: string,
  valueName: string,
  used: ProductImportUsed,
) {
  const slug = slugify(valueName) || "deger";
  const bySlug = used.attributeValues.get(`${attributeId}:${slug}`);
  if (bySlug) return bySlug;
  const byName = used.attributeValues.get(`${attributeId}:name:${valueName.toLocaleLowerCase("tr-TR")}`);
  if (byName) return byName;
  throw new Error(`Özellik değeri hazır değil: ${valueName}`);
}

export async function ensureImportAttributeValues(
  drafts: ProductImportDraft[],
  used: ProductImportUsed,
) {
  const pending: Array<{
    id: string;
    attributeId: string;
    name: string;
    slug: string;
    isActive: boolean;
    sortOrder: number;
  }> = [];

  for (const draft of drafts) {
    for (const variant of draft.variants) {
      for (const option of variant.optionValues) {
        const valueName = option.valueName;
        const slug = slugify(valueName) || "deger";
        const bySlug = used.attributeValues.get(`${option.attributeId}:${slug}`);
        const byName = used.attributeValues.get(
          `${option.attributeId}:name:${valueName.toLocaleLowerCase("tr-TR")}`,
        );
        if (bySlug || byName) continue;

        let uniqueSlug = slug.slice(0, 80);
        let index = 2;
        while (used.attributeValues.has(`${option.attributeId}:${uniqueSlug}`)) {
          uniqueSlug = `${slug}-${index}`.slice(0, 80);
          index += 1;
        }
        const sortOrder = (used.attributeValueSort.get(option.attributeId) ?? -1) + 1;
        used.attributeValueSort.set(option.attributeId, sortOrder);
        const id = newRecordId();
        const resolved = { id, name: valueName.slice(0, 191) };
        used.attributeValues.set(`${option.attributeId}:${uniqueSlug}`, resolved);
        used.attributeValues.set(
          `${option.attributeId}:name:${valueName.toLocaleLowerCase("tr-TR")}`,
          resolved,
        );
        pending.push({
          id,
          attributeId: option.attributeId,
          name: valueName.slice(0, 191),
          slug: uniqueSlug,
          isActive: true,
          sortOrder,
        });
      }
    }
  }

  if (pending.length > 0) {
    await prisma.productAttributeValue.createMany({ data: pending });
  }
}

export function prepareImportedProduct(
  draft: ProductImportDraft,
  used: ProductImportUsed,
  sortOrder: number,
): PreparedImportedProduct {
  const now = new Date();
  const productId = newRecordId();
  const slug = nextUniqueLabel(slugify(draft.slugInput || draft.title) || "urun", used.slugs);
  const productSku = draft.sku ? nextUniqueLabel(draft.sku, used.productSkus) : null;

  const variants: PreparedImportedProduct["variants"] = [];
  const selections: PreparedImportedProduct["selections"] = [];

  for (const [index, variant] of draft.variants.entries()) {
    const resolved = variant.optionValues.map((option) => {
      const value = resolveCachedAttributeValue(option.attributeId, option.valueName, used);
      return {
        attributeId: option.attributeId,
        valueId: value.id,
        valueName: value.name,
      };
    });
    const skuSeed =
      variant.sku ||
      [productSku, ...resolved.map((item) => item.valueName)].filter(Boolean).join("-") ||
      `SKU-${index + 1}`;
    const variantId = newRecordId();
    variants.push({
      id: variantId,
      productId,
      sku: nextUniqueLabel(skuSeed, used.variantSkus),
      barcode: variant.barcode || null,
      title: formatVariantTitle(resolved.map((item) => item.valueName)),
      priceMinor: variant.priceMinor,
      compareAtMinor: variant.compareAtMinor,
      stockQuantity: variant.stockQuantity,
      trackInventory: true,
      allowBackorder: false,
      isDefault: index === 0,
      isActive: true,
      image: variant.imageUrl,
      combinationKey:
        resolved.length === 0
          ? DEFAULT_VARIANT_COMBINATION_KEY
          : buildVariantCombinationKey(
              resolved.map((item) => ({ attributeId: item.attributeId, valueId: item.valueId })),
            ),
      sortOrder: index,
      createdAt: now,
      updatedAt: now,
    });
    for (const item of resolved) {
      selections.push({
        variantId,
        attributeId: item.attributeId,
        valueId: item.valueId,
      });
    }
  }

  return {
    productId,
    product: {
      id: productId,
      title: draft.title,
      slug,
      summary: draft.summary,
      content: draft.content,
      categoryId: draft.categoryId,
      brandId: draft.brandId,
      supplierId: draft.supplierId,
      sku: productSku,
      mpn: draft.mpn,
      upc: draft.upc,
      gtin: draft.gtin,
      image: draft.imageUrls[0] ?? null,
      basePriceMinor: draft.basePriceMinor,
      compareAtMinor: draft.compareAtMinor,
      costMinor: draft.costMinor,
      taxRatePercent: draft.taxRatePercent,
      widthCm: draft.widthCm,
      heightCm: draft.heightCm,
      depthCm: draft.depthCm,
      weightKg: draft.weightKg,
      extraShippingMinor: draft.extraShippingMinor,
      estimatedDelivery: draft.estimatedDelivery,
      saleUnit: draft.saleUnit,
      minOrderQty: draft.minOrderQty,
      quantityStep: draft.quantityStep,
      visibility: draft.visibility,
      availableForOrder: draft.availableForOrder,
      showPrice: draft.showPrice,
      onlineOnly: false,
      onSale: false,
      outOfStockBehavior: draft.outOfStockBehavior,
      isActive: draft.isActive,
      sortOrder,
      seoTitle: draft.seoTitle,
      seoDescription: draft.seoDescription,
      createdAt: now,
      updatedAt: now,
    },
    variants,
    selections,
    images: draft.imageUrls.map((url, index) => ({
      id: newRecordId(),
      productId,
      url,
      alt: draft.title,
      isCover: index === 0,
      sortOrder: index,
    })),
  };
}

export async function insertImportedProducts(
  items: PreparedImportedProduct[],
  tx: Pick<
    typeof prisma,
    "product" | "productVariant" | "productVariantSelection" | "productImage"
  > = prisma,
) {
  if (items.length === 0) return;
  await tx.product.createMany({ data: items.map((item) => item.product) });
  const variants = items.flatMap((item) => item.variants);
  if (variants.length > 0) {
    await tx.productVariant.createMany({ data: variants });
  }
  const selections = items.flatMap((item) => item.selections);
  if (selections.length > 0) {
    await tx.productVariantSelection.createMany({ data: selections });
  }
  const images = items.flatMap((item) => item.images);
  if (images.length > 0) {
    await tx.productImage.createMany({ data: images });
  }
}

export async function createImportedProduct(
  draft: ProductImportDraft,
  used: ProductImportUsed,
  sortOrder: number,
) {
  await ensureImportAttributeValues([draft], used);
  const prepared = prepareImportedProduct(draft, used, sortOrder);
  await insertImportedProducts([prepared]);
  return { id: prepared.productId };
}
