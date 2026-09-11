import "server-only";

import { Prisma, type XmlFeedMatchBy, type XmlFeedPriceRound, type XmlProductFeed } from "@prisma/client";
import { yieldToEventLoop } from "@/lib/background-yield";
import { bustCatalogCache } from "@/lib/catalog-products";
import {
  appendImportedVariant,
  buildImportGroup,
  createProductImportUsed,
  ensureImportAttributeValues,
  ensureImportAttributesFromRows,
  feedImportSkipFlags,
  groupImportRawRows,
  hydrateProductImportUsed,
  insertImportedProductsSafely,
  loadProductImportLookups,
  prepareImportedProduct,
  skuKey,
  syncImportedProductFilters,
  uniquesFromUsed,
  type ProductImportLookups,
  type ProductImportRawRow,
  type PreparedImportedProduct,
} from "@/lib/product-import";
import {
  createImportImageCache,
  localizeImportImageUrl,
  localizeImportedProductImagesBatch,
} from "@/lib/product-import-images";
import { prisma } from "@/lib/prisma";
import { uniqueBarcodeOrNull } from "@/lib/product-barcode-db";
import { writeCatalogStock } from "@/lib/inventory";
import { parseFeedMajor, resolveImportedListPrices, taxExcludedMinor } from "@/lib/product-money";
import { extractEditorUploadPathsFromHtml } from "@/lib/rich-text-uploads";
import { slugify } from "@/lib/slug";
import { deletePublicAsset } from "@/lib/uploads";
import { parseXmlDocument, detectXmlItemPath, extractXmlItems, mapFeedItemToRawRows, takeFeedItemSlice, collectMissingMappedFeedTags } from "@/lib/xml-product-feed";
import { campaignLockedFeedPrices, loadUnrestoredCampaignProductIds } from "@/lib/campaigns";
import {
  excludeFeedLockedProductFilter,
  feedSyncUpdateLocks,
  loadFeedSyncLocks,
} from "@/lib/feed-sync-locks";
import { withPrismaRetry } from "@/lib/prisma-retry";
import { fetchXmlFeedText } from "@/lib/xml-product-feed-fetch";
import {
  isXmlFeedMatchBy,
  parseXmlFeedMapping,
  parseXmlFeedValueMaps,
  updateFieldsFromFlags,
  xmlFeedShouldCloseForSale,
  xmlFeedSaleCloseReasons,
  parseFeedSaleStatus,
  XML_FEED_MAX_IMAGES,
  type XmlFeedMatchBy as SharedMatchBy,
  type XmlFeedCatalogFlags,
  type XmlFeedOutOfStockBehavior,
  type XmlFeedPriceRound as SharedRound,
  type XmlFeedTargetKey,
} from "@/lib/xml-product-feed-shared";
import { computeNextRunAt } from "@/lib/xml-product-feed-store";
import {
  appendFeedSyncWarningsToRunMessage,
  createFeedSyncWarningCollector,
  formatFeedLastMessageWithWarnings,
  mergeLastSyncWarningsIntoMapJson,
  type FeedSaleCloseReason,
} from "@/lib/feed-sync-warnings";

type MatchHit = {
  productId: string;
  variantId: string;
  taxRatePercent: number;
  supplierId: string | null;
};

function asMatchBy(value: XmlFeedMatchBy | string): SharedMatchBy {
  return isXmlFeedMatchBy(value) ? value : "BARCODE";
}

function resolveLookup(items: Array<{ id: string; name: string; slug: string }>, raw: string) {
  const value = raw.trim();
  if (!value) return null;
  const slug = slugify(value);
  return (
    items.find((item) => item.slug === slug) ??
    items.find((item) => item.name.toLocaleLowerCase("tr-TR") === value.toLocaleLowerCase("tr-TR")) ??
    null
  );
}

function parseOptionalNumber(raw: string | undefined) {
  const normalized = (raw ?? "").trim().replace(",", ".");
  if (!normalized) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function asRound(value: XmlFeedPriceRound): SharedRound {
  switch (value) {
    case "NONE":
    case "INTEGER":
    case "NINETY_NINE":
      return value;
    default: {
      const _exhaustive: never = value;
      return _exhaustive;
    }
  }
}

function applySkuPrefix(value: string, prefix: string) {
  const trimmed = value.trim();
  const head = prefix.trim();
  if (!trimmed || !head) return trimmed;
  if (trimmed.toLocaleLowerCase("tr-TR").startsWith(head.toLocaleLowerCase("tr-TR"))) return trimmed;
  return `${head}${trimmed}`.slice(0, 80);
}

function parseXmlMajor(raw: string) {
  return parseFeedMajor(raw);
}

function parseXmlStock(raw: string) {
  const value = raw.trim().toLocaleLowerCase("tr-TR");
  if (!value) return null;
  const compact = value.replace(/[\s_-]+/g, "");
  if (["instock", "available", "var", "evet", "true", "yes", "1"].includes(compact)) return 1;
  if (["outofstock", "unavailable", "yok", "hayir", "false", "no", "0"].includes(compact)) return 0;
  const parsed = Number.parseInt(value.replace(/[^\d-]/g, ""), 10);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, parsed);
}

function applyPriceRules(
  raw: string,
  includesTax: boolean,
  markupPercent: number,
  round: SharedRound,
  taxPercent: number,
) {
  const major = parseXmlMajor(raw);
  if (major == null) return null;
  let minor = Math.round(major * 100);
  if (includesTax) minor = taxExcludedMinor(minor, taxPercent);
  if (Number.isFinite(markupPercent) && markupPercent !== 0) {
    minor = Math.round(minor * (1 + markupPercent / 100));
  }
  switch (round) {
    case "NONE":
      break;
    case "INTEGER":
      minor = Math.round(minor / 100) * 100;
      break;
    case "NINETY_NINE":
      minor = Math.max(99, Math.floor(minor / 100) * 100 + 99);
      break;
    default: {
      const _exhaustive: never = round;
      return _exhaustive;
    }
  }
  return { minor, sourceMinor: Math.round(major * 100) };
}

function matchKeys(row: ProductImportRawRow, matchBy: SharedMatchBy, skuPrefix: string) {
  switch (matchBy) {
    case "BARCODE": {
      const barcode = (row.barcode ?? "").trim();
      return barcode ? [barcode] : [];
    }
    case "SKU": {
      const sku = (row.sku ?? "").trim();
      if (!sku) return [];
      return [...new Set([sku, applySkuPrefix(sku, skuPrefix)])];
    }
    case "PRODUCT_CODE": {
      const code = ((row.productKey ?? row.sku) || "").trim();
      if (!code) return [];
      return [...new Set([code, applySkuPrefix(code, skuPrefix)])];
    }
    case "PRODUCT_ID": {
      const raw = ((row.externalId ?? row.productKey ?? row.sku) || "").trim();
      if (!raw) return [];
      return [...new Set([raw, applySkuPrefix(raw, skuPrefix)])];
    }
    default: {
      const _exhaustive: never = matchBy;
      return _exhaustive;
    }
  }
}

type XmlFeedStockPolicy = XmlFeedCatalogFlags & {
  stockLimit: number;
  outOfStockBehavior: XmlFeedOutOfStockBehavior;
};

function applyRowDefaults(
  row: ProductImportRawRow,
  feed: XmlProductFeed,
  lookups: ProductImportLookups,
  defaults: { categoryName: string; brandName: string; supplierName: string },
  stockPolicy: XmlFeedStockPolicy,
): ProductImportRawRow {
  const next: ProductImportRawRow = { ...row };
  if (!next.externalId?.trim() && feed.matchBy === "PRODUCT_ID") {
    const rawId = (row.externalId ?? row.productKey ?? "").trim();
    if (rawId) next.externalId = rawId.slice(0, 191);
  }
  if (!next.categoryRejected) {
    const categoryRaw = (next.category ?? "").trim();
    if (categoryRaw) {
      const category = resolveLookup(lookups.categories, categoryRaw);
      if (category) next.category = category.name;
      else next.categoryRejected = true;
    } else if (defaults.categoryName) {
      next.category = defaults.categoryName;
    }
  }
  if (!next.brandRejected) {
    const brandRaw = (next.brand ?? "").trim();
    if (brandRaw) {
      const brand = resolveLookup(lookups.brands, brandRaw);
      if (brand) next.brand = brand.name;
      else next.brandRejected = true;
    } else if (defaults.brandName) {
      next.brand = defaults.brandName;
    }
  } else {
    next.brand = "";
  }
  if (next.supplier && !resolveLookup(lookups.suppliers, next.supplier)) {
    next.supplier = defaults.supplierName;
  } else if (!next.supplier && defaults.supplierName) {
    next.supplier = defaults.supplierName;
  }

  const taxRaw = (next.taxRate ?? "").trim();
  const taxPercent = taxRaw
    ? Number.parseInt(taxRaw, 10)
    : lookups.defaultTaxPercent;
  const safeTax = Number.isFinite(taxPercent) ? taxPercent : lookups.defaultTaxPercent;
  const markup = Number(feed.priceMarkupPercent);
  const round = asRound(feed.priceRound);
  let createdPriceMinor = 0;

  if (next.price) {
    const priced = applyPriceRules(next.price, feed.priceIncludesTax, markup, round, safeTax);
    if (priced) {
      createdPriceMinor = priced.minor;
      if (!next.cost) {
        const costMinor = feed.priceIncludesTax
          ? taxExcludedMinor(priced.sourceMinor, safeTax)
          : priced.sourceMinor;
        next.cost = (costMinor / 100).toFixed(2);
      }
      next.price = (priced.minor / 100).toFixed(2);
    }
  }
  if (next.discount) {
    const discounted = applyPriceRules(next.discount, feed.priceIncludesTax, markup, round, safeTax);
    if (discounted) next.discount = (discounted.minor / 100).toFixed(2);
  }
  if (next.compareAt) {
    const compared = applyPriceRules(next.compareAt, feed.priceIncludesTax, markup, round, safeTax);
    if (compared) next.compareAt = (compared.minor / 100).toFixed(2);
  }

  if (next.stock) {
    const stock = parseXmlStock(next.stock);
    if (stock != null) next.stock = String(stock);
  }
  next.outOfStockBehavior = stockPolicy.outOfStockBehavior;
  const createdStock = next.stock ? parseXmlStock(next.stock) : 0;
  if (next.sku) next.sku = applySkuPrefix(next.sku, feed.skuPrefix);
  if (next.productKey) next.productKey = applySkuPrefix(next.productKey, feed.skuPrefix);
  if (!next.sku && next.productKey) next.sku = next.productKey;
  if (!next.sku && next.externalId) next.sku = applySkuPrefix(next.externalId, feed.skuPrefix);
  if (!next.barcode?.trim() && next.sku) next.barcode = next.sku.slice(0, 64);
  if (next.imageUrl) {
    const urls = next.imageUrl
      .split(/\n+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, XML_FEED_MAX_IMAGES);
    next.imageUrl = urls.join("\n");
  }
  const hasImage = Boolean(next.imageUrl?.trim());
  const saleOpen = parseFeedSaleStatus(next.availableForOrder);
  if (saleOpen === true) {
    next.availableForOrder = "Evet";
    next.isActive = "Evet";
  } else if (saleOpen === false) {
    next.availableForOrder = "Hayır";
    next.isActive = "Hayır";
  }
  if (xmlFeedShouldCloseForSale(createdStock, stockPolicy) || createdPriceMinor <= 0 || !hasImage || saleOpen === false) {
    next.availableForOrder = "Hayır";
    next.isActive = "Hayır";
  }
  return next;
}

function setProductIdHit(
  hits: Map<string, MatchHit>,
  key: string | null | undefined,
  hit: MatchHit,
  preferredSupplierId: string | null,
) {
  const trimmed = (key ?? "").trim();
  if (!trimmed) return;
  const aliases = [...new Set([trimmed, skuKey(trimmed)].filter(Boolean))];
  for (const alias of aliases) {
    const existing = hits.get(alias);
    if (!existing) {
      hits.set(alias, hit);
      continue;
    }
    if (
      preferredSupplierId &&
      hit.supplierId === preferredSupplierId &&
      existing.supplierId !== preferredSupplierId
    ) {
      hits.set(alias, hit);
    }
  }
}

async function loadMatches(matchBy: SharedMatchBy, keys: string[], supplierId: string | null = null) {
  const hits = new Map<string, MatchHit>();
  if (keys.length === 0) return hits;
  const unique = [...new Set(keys.map((key) => key.trim()).filter(Boolean))];

  switch (matchBy) {
    case "BARCODE": {
      const variants = await prisma.productVariant.findMany({
        where: { barcode: { in: unique } },
        select: {
          id: true,
          barcode: true,
          productId: true,
          product: { select: { taxRatePercent: true } },
        },
      });
      for (const variant of variants) {
        const barcode = variant.barcode?.trim();
        if (barcode) {
          hits.set(barcode, {
            productId: variant.productId,
            variantId: variant.id,
            taxRatePercent: variant.product.taxRatePercent,
            supplierId: null,
          });
        }
      }
      return hits;
    }
    case "SKU": {
      const [variants, products] = await Promise.all([
        prisma.productVariant.findMany({
          where: { sku: { in: unique } },
          select: {
            id: true,
            sku: true,
            productId: true,
            product: { select: { taxRatePercent: true } },
          },
        }),
        prisma.product.findMany({
          where: { sku: { in: unique } },
          select: {
            id: true,
            sku: true,
            taxRatePercent: true,
            variants: { select: { id: true, isDefault: true }, orderBy: { sortOrder: "asc" }, take: 1 },
          },
        }),
      ]);
      for (const variant of variants) {
        hits.set(skuKey(variant.sku), {
          productId: variant.productId,
          variantId: variant.id,
          taxRatePercent: variant.product.taxRatePercent,
          supplierId: null,
        });
      }
      for (const product of products) {
        const variantId = product.variants[0]?.id;
        if (!product.sku || !variantId) continue;
        const key = skuKey(product.sku);
        if (!hits.has(key)) {
          hits.set(key, {
            productId: product.id,
            variantId,
            taxRatePercent: product.taxRatePercent,
            supplierId: null,
          });
        }
      }
      return hits;
    }
    case "PRODUCT_CODE": {
      const [products, variants] = await Promise.all([
        prisma.product.findMany({
          where: { sku: { in: unique } },
          select: {
            id: true,
            sku: true,
            taxRatePercent: true,
            variants: { select: { id: true }, orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }], take: 1 },
          },
        }),
        prisma.productVariant.findMany({
          where: { sku: { in: unique } },
          select: {
            id: true,
            sku: true,
            productId: true,
            product: { select: { taxRatePercent: true } },
          },
        }),
      ]);
      for (const variant of variants) {
        hits.set(skuKey(variant.sku), {
          productId: variant.productId,
          variantId: variant.id,
          taxRatePercent: variant.product.taxRatePercent,
          supplierId: null,
        });
      }
      for (const product of products) {
        const variantId = product.variants[0]?.id;
        if (!product.sku || !variantId) continue;
        const key = skuKey(product.sku);
        if (!hits.has(key)) {
          hits.set(key, {
            productId: product.id,
            variantId,
            taxRatePercent: product.taxRatePercent,
            supplierId: null,
          });
        }
      }
      return hits;
    }
    case "PRODUCT_ID": {
      const urlIds = unique.flatMap((key) => {
        if (!/^\d+$/.test(key)) return [];
        const parsed = Number.parseInt(key, 10);
        return Number.isSafeInteger(parsed) && parsed > 0 ? [parsed] : [];
      });
      const products = await prisma.$queryRaw<
        Array<{
          id: string;
          sku: string | null;
          externalId: string | null;
          urlId: number;
          supplierId: string | null;
          taxRatePercent: number;
        }>
      >(Prisma.sql`
        SELECT id, sku, externalId, urlId, supplierId, taxRatePercent
        FROM products
        WHERE externalId IN (${Prisma.join(unique)})
           OR sku IN (${Prisma.join(unique)})
           OR id IN (${Prisma.join(unique)})
           ${urlIds.length > 0 ? Prisma.sql`OR urlId IN (${Prisma.join(urlIds)})` : Prisma.empty}
      `);
      const productIds = products.map((product) => product.id);
      const [defaultVariants, variants] = await Promise.all([
        productIds.length > 0
          ? prisma.productVariant.findMany({
              where: { productId: { in: productIds } },
              select: { id: true, productId: true, isDefault: true, sortOrder: true },
              orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }],
            })
          : Promise.resolve([]),
        prisma.productVariant.findMany({
          where: { sku: { in: unique } },
          select: {
            id: true,
            sku: true,
            productId: true,
            product: { select: { taxRatePercent: true, supplierId: true } },
          },
        }),
      ]);
      const variantByProduct = new Map<string, string>();
      for (const variant of defaultVariants) {
        if (!variantByProduct.has(variant.productId)) {
          variantByProduct.set(variant.productId, variant.id);
        }
      }
      for (const product of products) {
        const variantId = variantByProduct.get(product.id);
        if (!variantId) continue;
        const hit: MatchHit = {
          productId: product.id,
          variantId,
          taxRatePercent: product.taxRatePercent,
          supplierId: product.supplierId,
        };
        setProductIdHit(hits, product.externalId, hit, supplierId);
        setProductIdHit(hits, product.sku, hit, supplierId);
        setProductIdHit(hits, product.id, hit, supplierId);
        setProductIdHit(hits, String(product.urlId), hit, supplierId);
      }
      for (const variant of variants) {
        setProductIdHit(
          hits,
          variant.sku,
          {
            productId: variant.productId,
            variantId: variant.id,
            taxRatePercent: variant.product.taxRatePercent,
            supplierId: variant.product.supplierId,
          },
          supplierId,
        );
      }
      return hits;
    }
    default: {
      const _exhaustive: never = matchBy;
      return _exhaustive;
    }
  }
}

function hitForKeys(hits: Map<string, MatchHit>, keys: string[], matchBy: SharedMatchBy) {
  for (const key of keys) {
    const trimmed = key.trim();
    const lookups =
      matchBy === "BARCODE"
        ? [trimmed]
        : matchBy === "PRODUCT_ID"
          ? [...new Set([trimmed, skuKey(trimmed)])]
          : [skuKey(key)];
    for (const lookup of lookups) {
      const hit = hits.get(lookup);
      if (hit) return hit;
    }
  }
  return null;
}

function variantSkuKeys(row: ProductImportRawRow, skuPrefix: string) {
  const sku = (row.sku ?? "").trim();
  if (!sku) return [];
  return [...new Set([sku, applySkuPrefix(sku, skuPrefix)])];
}

function barcodeKeys(row: ProductImportRawRow) {
  const barcode = (row.barcode ?? "").trim();
  return barcode ? [barcode] : [];
}

function productKeyToken(row: ProductImportRawRow) {
  return (row.productKey ?? row.externalId ?? "").trim().toLocaleLowerCase("tr-TR");
}

function allowsUpdate(fields: Set<XmlFeedTargetKey>, key: XmlFeedTargetKey) {
  return fields.has(key);
}

function xmlImageUrlsFromRow(row: ProductImportRawRow) {
  return (row.imageUrl ?? "")
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, XML_FEED_MAX_IMAGES);
}

async function updateMatchedProduct(
  hit: MatchHit,
  row: ProductImportRawRow,
  feed: XmlProductFeed,
  lookups: ProductImportLookups,
  imageCache: ReturnType<typeof createImportImageCache>,
  updateFields: Set<XmlFeedTargetKey>,
  stockPolicy: XmlFeedStockPolicy,
  skipVariant = false,
  skipProduct = false,
  lockPrices = false,
  lockStock = false,
  lockSaleClose = false,
) {
  const taxPercent = hit.taxRatePercent || lookups.defaultTaxPercent;
  const markup = Number(feed.priceMarkupPercent);
  const priced = row.price
    ? applyPriceRules(row.price, feed.priceIncludesTax, markup, asRound(feed.priceRound), taxPercent)
    : null;
  const discounted = row.discount
    ? applyPriceRules(row.discount, feed.priceIncludesTax, markup, asRound(feed.priceRound), taxPercent)
    : null;
  const compared = row.compareAt
    ? applyPriceRules(row.compareAt, feed.priceIncludesTax, markup, asRound(feed.priceRound), taxPercent)
    : null;
  const storedPrice = resolveImportedListPrices({
    saleMinor: priced?.minor ?? 0,
    discountMinor: discounted?.minor ?? null,
    compareAtMinor: compared?.minor ?? null,
  });
  const stock = row.stock ? parseXmlStock(row.stock) : null;
  const cost = row.cost
    ? applyPriceRules(row.cost, feed.priceIncludesTax, 0, "NONE", taxPercent)
    : null;

  const productData: Record<string, unknown> = {};
  const xmlImageUrls = xmlImageUrlsFromRow(row);
  const closeReasons: FeedSaleCloseReason[] = xmlFeedSaleCloseReasons(stock, stockPolicy);
  if (allowsUpdate(updateFields, "price") && (priced == null || priced.minor <= 0)) {
    closeReasons.push("zero_price");
  }
  if (allowsUpdate(updateFields, "imageUrl") && xmlImageUrls.length === 0) {
    closeReasons.push("no_image");
  }
  if (parseFeedSaleStatus(row.availableForOrder) === false) {
    closeReasons.push("feed_closed");
  }
  const closeForSale = closeReasons.length > 0;
  if (allowsUpdate(updateFields, "title") && row.title?.trim()) {
    productData.title = row.title.trim().slice(0, 191);
  }
  if (allowsUpdate(updateFields, "content") && row.content?.trim()) productData.content = row.content;
  if (allowsUpdate(updateFields, "summary") && row.summary?.trim()) productData.summary = row.summary;
  if (allowsUpdate(updateFields, "seoTitle") && row.seoTitle?.trim()) {
    productData.seoTitle = row.seoTitle.trim().slice(0, 191);
  }
  if (allowsUpdate(updateFields, "seoDescription") && row.seoDescription?.trim()) {
    productData.seoDescription = row.seoDescription.trim().slice(0, 500);
  }
  if (allowsUpdate(updateFields, "mpn") && row.mpn?.trim()) productData.mpn = row.mpn.trim().slice(0, 64);
  if (allowsUpdate(updateFields, "gtin") && row.gtin?.trim()) productData.gtin = row.gtin.trim().slice(0, 64);
  if (allowsUpdate(updateFields, "upc") && row.upc?.trim()) productData.upc = row.upc.trim().slice(0, 64);
  if (allowsUpdate(updateFields, "taxRate") && row.taxRate?.trim()) {
    const tax = Number.parseInt(row.taxRate, 10);
    if (Number.isFinite(tax) && tax >= 0 && tax <= 100) productData.taxRatePercent = tax;
  }
  if (allowsUpdate(updateFields, "weightKg")) {
    const value = parseOptionalNumber(row.weightKg);
    if (value != null) productData.weightKg = value;
  }
  if (allowsUpdate(updateFields, "widthCm")) {
    const value = parseOptionalNumber(row.widthCm);
    if (value != null) productData.widthCm = value;
  }
  if (allowsUpdate(updateFields, "heightCm")) {
    const value = parseOptionalNumber(row.heightCm);
    if (value != null) productData.heightCm = value;
  }
  if (allowsUpdate(updateFields, "depthCm")) {
    const value = parseOptionalNumber(row.depthCm);
    if (value != null) productData.depthCm = value;
  }
  if (allowsUpdate(updateFields, "category") && row.category?.trim()) {
    const category = resolveLookup(lookups.categories, row.category);
    if (category) productData.categoryId = category.id;
  }
  if (allowsUpdate(updateFields, "brand") && row.brand?.trim()) {
    const brand = resolveLookup(lookups.brands, row.brand);
    if (brand) productData.brandId = brand.id;
  }
  if (allowsUpdate(updateFields, "supplier") && row.supplier?.trim()) {
    const supplier = resolveLookup(lookups.suppliers, row.supplier);
    if (supplier) productData.supplierId = supplier.id;
  }
  if (
    !lockPrices &&
    (allowsUpdate(updateFields, "price") ||
      allowsUpdate(updateFields, "discount") ||
      allowsUpdate(updateFields, "compareAt")) &&
    priced &&
    priced.minor > 0
  ) {
    productData.basePriceMinor = storedPrice.chargeMinor;
    productData.compareAtMinor = storedPrice.listMinor;
    productData.onSale = storedPrice.listMinor != null;
  }
  if (allowsUpdate(updateFields, "cost") && cost) {
    productData.costMinor = cost.minor;
  }
  const externalId =
    row.externalId?.trim() ||
    (feed.matchBy === "PRODUCT_ID" ? (row.productKey ?? "").trim() : "");
  if (allowsUpdate(updateFields, "productKey") && row.productKey?.trim()) {
    productData.sku = row.productKey.trim().slice(0, 191);
  } else if (allowsUpdate(updateFields, "sku") && row.sku?.trim() && !row.productKey) {
    productData.sku = row.sku.trim().slice(0, 191);
  }

  if (allowsUpdate(updateFields, "imageUrl") && xmlImageUrls.length > 0 && !skipProduct) {
    const localized: string[] = [];
    for (const url of xmlImageUrls) {
      try {
        localized.push(await localizeImportImageUrl(url, imageCache));
      } catch {
        /* indirilemeyen görsel mevcut galeriyi korur; satışa kapatmaz */
      }
    }
    if (localized.length > 0) {
      await withPrismaRetry(async () => {
        await prisma.productImage.deleteMany({ where: { productId: hit.productId } });
        await prisma.productImage.createMany({
          data: localized.map((url, index) => ({
            productId: hit.productId,
            url,
            alt: (row.title ?? "").slice(0, 191) || null,
            isCover: index === 0,
            sortOrder: index,
          })),
        });
      });
      productData.image = localized[0];
    }
  }

  productData.outOfStockBehavior = stockPolicy.outOfStockBehavior;

  if (!lockSaleClose) {
    if (closeForSale) {
      productData.availableForOrder = false;
      productData.isActive = false;
    } else {
      productData.availableForOrder = true;
      productData.isActive = true;
    }
  }

  if (!skipProduct) {
    if (Object.keys(productData).length > 0) {
      await withPrismaRetry(() =>
        prisma.product.update({ where: { id: hit.productId }, data: productData }),
      );
    }
    if (externalId) {
      await withPrismaRetry(() =>
        prisma.$executeRaw`UPDATE products SET externalId = ${externalId.slice(0, 191)} WHERE id = ${hit.productId}`,
      );
    }
    if (allowsUpdate(updateFields, "filters")) {
      await withPrismaRetry(() =>
        syncImportedProductFilters(hit.productId, row.filterValues, lookups),
      );
    }
  }

  const didClose = closeForSale && !skipProduct && !lockSaleClose;
  if (skipVariant || !hit.variantId) {
    return { closed: didClose, reasons: didClose ? closeReasons : [] };
  }

  const variantData: Record<string, unknown> = {};
  if (
    !lockPrices &&
    (allowsUpdate(updateFields, "price") ||
      allowsUpdate(updateFields, "discount") ||
      allowsUpdate(updateFields, "compareAt")) &&
    priced &&
    priced.minor > 0
  ) {
    variantData.priceMinor = storedPrice.chargeMinor;
    variantData.compareAtMinor = storedPrice.listMinor;
  }
  if (!lockStock && allowsUpdate(updateFields, "stock") && stock != null) {
    variantData.stockQuantity = stock;
  }
  if (allowsUpdate(updateFields, "barcode") && row.barcode?.trim()) {
    const barcode = await uniqueBarcodeOrNull(row.barcode, hit.variantId);
    if (barcode) variantData.barcode = barcode;
  }
  if (allowsUpdate(updateFields, "sku") && row.sku?.trim()) {
    variantData.sku = row.sku.trim().slice(0, 191);
  }
  if (Object.keys(variantData).length > 0) {
    await withPrismaRetry(() =>
      prisma.productVariant.update({ where: { id: hit.variantId }, data: variantData }),
    );
    if (!lockStock && allowsUpdate(updateFields, "stock") && stock != null) {
      await writeCatalogStock(prisma, hit.variantId, stock, { note: "XML stok senkronu" });
    }
  }
  return { closed: didClose, reasons: didClose ? closeReasons : [] };
}

type XmlRowFailure = {
  rowNumber: number;
  title: string;
  reason: string;
};

function shortenPrismaError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const unknownArg = message.match(/Unknown argument `[A-Za-z0-9_]+`/);
  if (unknownArg) return `Veritabanı alanı uyumsuz: ${unknownArg[0]}`;
  const unique = message.match(/Unique constraint[^\n.]*/i);
  if (unique) return unique[0];
  const lines = message
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line.length < 220);
  const useful = lines.find((line) =>
    /Unknown|Unique|constraint|required|Invalid|P2002|failed/i.test(line),
  );
  return useful ?? lines[0] ?? "Ürün eklenemedi";
}

function pushFailure(
  failures: XmlRowFailure[],
  row: { rowNumber: number; title?: string },
  reason: string,
) {
  const text = reason.trim() || "Bilinmeyen hata";
  failures.push({
    rowNumber: row.rowNumber,
    title: (row.title ?? "").trim().slice(0, 80),
    reason: text.slice(0, 240),
  });
}

function formatRunFailureMessage(
  counts: {
    created: number;
    updated: number;
    skipped: number;
    failed: number;
    deactivated: number;
    deleted: number;
  },
  failures: XmlRowFailure[],
) {
  const parts = [
    `${counts.created} yeni`,
    `${counts.updated} güncellendi`,
    `${counts.skipped} atlandı`,
    `${counts.failed} hatalı`,
  ];
  if (counts.deactivated > 0) parts.push(`${counts.deactivated} satışa kapatıldı`);
  if (counts.deleted > 0) parts.push(`${counts.deleted} satılmamış silindi`);
  const summary = parts.join(", ");
  if (failures.length === 0) return summary;
  const groups = new Map<string, number>();
  for (const item of failures) {
    groups.set(item.reason, (groups.get(item.reason) ?? 0) + 1);
  }
  const ranked = [...groups.entries()].sort((left, right) => right[1] - left[1]).slice(0, 8);
  const samples = failures.slice(0, 12);
  return [
    summary,
    "",
    "Hata özeti:",
    ...ranked.map(([reason, count]) => `• ${reason} (${count})`),
    "",
    "Örnek satırlar:",
    ...samples.map(
      (item) => `• Satır ${item.rowNumber}${item.title ? ` · ${item.title}` : ""}: ${item.reason}`,
    ),
  ].join("\n");
}

function parseSeenIds(raw: string | null | undefined) {
  try {
    const parsed: unknown = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return new Set<string>();
    return new Set(parsed.filter((item): item is string => typeof item === "string" && item.length > 0));
  } catch {
    return new Set<string>();
  }
}

function safeResumeCursor(value: unknown) {
  const cursor = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(cursor) || cursor < 0) return 0;
  return Math.floor(cursor);
}

async function loadRunResume(runId: string) {
  const rows = await prisma.$queryRawUnsafe<Array<{ resumeAt: number; seenIdsJson: string | null }>>(
    "SELECT `cursor` AS resumeAt, seenIdsJson FROM xml_product_feed_runs WHERE id = ?",
    runId,
  );
  return {
    cursor: safeResumeCursor(rows[0]?.resumeAt),
    seenIdsJson: rows[0]?.seenIdsJson ?? "[]",
  };
}

function collectProductUploadPaths(product: {
  image: string | null;
  content: string | null;
  images: Array<{ url: string }>;
  variants: Array<{ image: string | null }>;
  attachments: Array<{ url: string }>;
}) {
  const paths = new Set<string>();
  const add = (value: string | null | undefined) => {
    const raw = (value ?? "").trim().split("?")[0]?.split("#")[0] ?? "";
    if (raw.startsWith("/uploads/") && !raw.includes("..")) paths.add(raw);
  };
  add(product.image);
  for (const image of product.images) add(image.url);
  for (const variant of product.variants) add(variant.image);
  for (const attachment of product.attachments) add(attachment.url);
  for (const editorPath of extractEditorUploadPathsFromHtml(product.content)) add(editorPath);
  if (product.content) {
    const pattern = /\/uploads\/[a-zA-Z0-9/_-]+\.(?:webp|png|jpe?g|gif|avif|svg)/gi;
    let match: RegExpExecArray | null = pattern.exec(product.content);
    while (match) {
      add(match[0]);
      match = pattern.exec(product.content);
    }
  }
  return [...paths];
}

async function deleteUnsoldSupplierProducts(supplierId: string, excludeProductIds: Set<string>) {
  let deleted = 0;
  const batchSize = 40;
  for (;;) {
    const candidates = await prisma.product.findMany({
      where: {
        supplierId,
        ...excludeFeedLockedProductFilter(excludeProductIds),
        orderItems: { none: {} },
        variants: { none: { orderItems: { some: {} } } },
      },
      select: {
        id: true,
        image: true,
        content: true,
        images: { select: { url: true } },
        variants: { select: { image: true } },
        attachments: { select: { url: true } },
      },
      take: batchSize,
    });
    if (candidates.length === 0) break;
    for (const product of candidates) {
      const files = collectProductUploadPaths(product);
      await prisma.product.delete({ where: { id: product.id } });
      for (const file of files) {
        try {
          await deletePublicAsset(file);
        } catch (error) {
          console.error(error);
        }
      }
      deleted += 1;
      if (deleted % 5 === 0) await yieldToEventLoop();
    }
  }
  return deleted;
}

async function writeRunProgress(
  runId: string,
  data: {
    itemCount: number;
    createdCount: number;
    updatedCount: number;
    skippedCount: number;
    failedCount: number;
    cursor: number;
    seenIdsJson?: string;
  },
) {
  if (data.seenIdsJson != null) {
    await prisma.$executeRawUnsafe(
      "UPDATE xml_product_feed_runs SET itemCount = ?, createdCount = ?, updatedCount = ?, skippedCount = ?, failedCount = ?, `cursor` = ?, seenIdsJson = ? WHERE id = ?",
      data.itemCount,
      data.createdCount,
      data.updatedCount,
      data.skippedCount,
      data.failedCount,
      data.cursor,
      data.seenIdsJson,
      runId,
    );
    return;
  }
  await prisma.$executeRawUnsafe(
    "UPDATE xml_product_feed_runs SET itemCount = ?, createdCount = ?, updatedCount = ?, skippedCount = ?, failedCount = ?, `cursor` = ? WHERE id = ?",
    data.itemCount,
    data.createdCount,
    data.updatedCount,
    data.skippedCount,
    data.failedCount,
    data.cursor,
    runId,
  );
}

export async function syncXmlFeedRun(runId: string) {
  const run = await prisma.xmlProductFeedRun.findUnique({
    where: { id: runId },
    include: { feed: true },
  });
  if (!run) return;
  if (!run.feed.isActive) {
    const finishedAt = new Date();
    await prisma.xmlProductFeedRun.update({
      where: { id: runId },
      data: {
        status: "COMPLETED",
        message: "Kaynak pasif. Senkron atlandı.",
        finishedAt,
      },
    });
    await prisma.xmlProductFeed.update({
      where: { id: run.feedId },
      data: {
        lastStatus: "COMPLETED",
        lastMessage: "Kaynak pasif.",
        nextRunAt: null,
      },
    });
    return;
  }

  let resume = {
    cursor: safeResumeCursor((run as { cursor?: unknown }).cursor),
    seenIdsJson:
      typeof (run as { seenIdsJson?: unknown }).seenIdsJson === "string"
        ? (run as { seenIdsJson: string }).seenIdsJson
        : "[]",
  };
  try {
    resume = await loadRunResume(runId);
  } catch (error) {
    console.error(error);
  }
  const resuming = resume.cursor > 0;
  await prisma.xmlProductFeedRun.update({
    where: { id: runId },
    data: {
      status: "RUNNING",
      startedAt: run.startedAt ?? new Date(),
      finishedAt: null,
      message: resuming ? run.message : null,
    },
  });
  await prisma.xmlProductFeed.update({
    where: { id: run.feedId },
    data: {
      lastStatus: "RUNNING",
      lastMessage: resuming ? "Senkron kaldığı yerden devam ediyor…" : "XML okunuyor…",
    },
  });

  const feed = run.feed;
  const counts = {
    created: resuming ? run.createdCount : 0,
    updated: resuming ? run.updatedCount : 0,
    skipped: resuming ? run.skippedCount : 0,
    failed: resuming ? run.failedCount : 0,
    deactivated: run.deactivatedCount,
    deleted: 0,
    items: run.itemCount,
  };
  const failures: XmlRowFailure[] = [];
  const seenProductIds = parseSeenIds(resume.seenIdsJson);
  let importedAny = counts.created + counts.updated > 0;

  try {
    const xml = await fetchXmlFeedText(feed.url, feed.httpUser, feed.httpPass);
    const root = parseXmlDocument(xml);
    const itemPath = feed.itemPath.trim() || detectXmlItemPath(root);
    const items = extractXmlItems(root, itemPath);
    counts.items = items.length;
    await yieldToEventLoop();
    if (!itemPath) throw new Error("Ürün düğümü bulunamadı. Kaynak ayarından XML yolunu seçin.");

    if (feed.itemPath.trim() !== itemPath) {
      await prisma.xmlProductFeed.update({
        where: { id: feed.id },
        data: { itemPath },
      });
    }

    const mapping = parseXmlFeedMapping(feed.mappingJson);
    const valueMaps = parseXmlFeedValueMaps(feed.categoryMapJson);
    const updateFields = new Set(
      valueMaps.updateFields ??
        updateFieldsFromFlags({
          updatePrice: feed.updatePrice,
          updateStock: feed.updateStock,
          updateImages: feed.updateImages,
          updateContent: feed.updateContent,
          updateTitle: feed.updateTitle,
        }),
    );
    const campaignPriceLocks = await loadUnrestoredCampaignProductIds();
    const feedLocks = await loadFeedSyncLocks();
    const stockPolicy: XmlFeedStockPolicy = {
      stockLimit: valueMaps.stockLimit,
      outOfStockBehavior: valueMaps.outOfStockBehavior,
      closeAllForSale: valueMaps.closeAllForSale,
      closeZeroStock: valueMaps.closeZeroStock,
      deleteUnsold: valueMaps.deleteUnsold,
    };
    const allowCreate = feed.createNew && !stockPolicy.closeAllForSale && !stockPolicy.deleteUnsold;
    const matchBy = asMatchBy(feed.matchBy);
    const lookups = await loadProductImportLookups();
    const defaults = {
      categoryName: lookups.categories.find((item) => item.id === feed.defaultCategoryId)?.name ?? "",
      brandName: lookups.brands.find((item) => item.id === feed.defaultBrandId)?.name ?? "",
      supplierName: lookups.suppliers.find((item) => item.id === feed.supplierId)?.name ?? "",
    };
    const warningCollector = createFeedSyncWarningCollector();
    const missingMappedTags = collectMissingMappedFeedTags(items, mapping);

    const used = createProductImportUsed(lookups);
    await hydrateProductImportUsed(used);
    const imageCache = createImportImageCache();
    const last = allowCreate
      ? await prisma.product.findFirst({ orderBy: { sortOrder: "desc" }, select: { sortOrder: true } })
      : null;
    let sortOrder = (last?.sortOrder ?? -1) + 1;

    const startOffset = Math.min(resume.cursor, items.length);
    const variantPath = valueMaps.variantPath ?? "";
    for (let offset = startOffset; offset < items.length; ) {
      const slice = takeFeedItemSlice(items, offset, variantPath);
      if (slice.length === 0) break;
      await prisma.xmlProductFeed.update({
        where: { id: feed.id },
        data: {
          lastMessage: `${offset} / ${counts.items} satır işleniyor…`,
        },
      });
      const rawRows: ProductImportRawRow[] = [];
      let rowNumber = offset + 1;
      for (const item of slice) {
        const rows = mapFeedItemToRawRows(
          item,
          rowNumber,
          mapping,
          valueMaps.categories,
          valueMaps.brands,
          valueMaps.variantPath,
          valueMaps.filterValueAliases,
          lookups.filters,
        );
        rawRows.push(...rows);
        rowNumber += rows.length;
      }
      for (const row of rawRows) {
        if (row.categorySource) warningCollector.noteCategorySource(row.categorySource);
        if (row.brandSource) warningCollector.noteBrandSource(row.brandSource);
      }
      const skuHits = await loadMatches(
        "SKU",
        rawRows.flatMap((row) => variantSkuKeys(row, feed.skuPrefix)),
        feed.supplierId,
      );
      const barcodeHits = await loadMatches(
        "BARCODE",
        rawRows.flatMap((row) => barcodeKeys(row)),
        feed.supplierId,
      );
      const productHits = await loadMatches(
        matchBy,
        rawRows.flatMap((row) => matchKeys(row, matchBy, feed.skuPrefix)),
        feed.supplierId,
      );

      type PlannedRow = {
        row: ProductImportRawRow;
        action: "update" | "append" | "create";
        hit: MatchHit | null;
      };
      const planned: PlannedRow[] = [];
      const productIdByKey = new Map<string, MatchHit>();
      for (const row of rawRows) {
        const skuHit = hitForKeys(skuHits, variantSkuKeys(row, feed.skuPrefix), "SKU");
        const barcodeHit = hitForKeys(barcodeHits, barcodeKeys(row), "BARCODE");
        const productHit = hitForKeys(
          productHits,
          matchKeys(row, matchBy, feed.skuPrefix),
          matchBy,
        );
        const variantHit = skuHit ?? barcodeHit;
        const hit = variantHit ?? productHit;
        if (hit) {
          const key = productKeyToken(row);
          if (key) productIdByKey.set(key, hit);
          planned.push({
            row,
            action: variantHit ? "update" : "append",
            hit,
          });
        } else {
          planned.push({ row, action: "create", hit: null });
        }
      }
      for (const item of planned) {
        if (item.action !== "create") continue;
        const key = productKeyToken(item.row);
        const existing = key ? productIdByKey.get(key) : undefined;
        if (!existing) continue;
        item.action = "append";
        item.hit = existing;
      }

      const toCreate: ProductImportRawRow[] = [];
      const productTouched = new Set<string>();
      for (const item of planned) {
        if (item.action === "create") {
          if (!allowCreate) {
            counts.skipped += 1;
            continue;
          }
          const next = applyRowDefaults(item.row, feed, lookups, defaults, stockPolicy);
          const skipFlags = feedImportSkipFlags(next, lookups);
          if (skipFlags.category || skipFlags.brand) {
            counts.skipped += 1;
            warningCollector.noteSkip(next, false, skipFlags);
            continue;
          }
          toCreate.push(next);
          continue;
        }
        if (!item.hit) {
          counts.skipped += 1;
          continue;
        }
        const skipFlags = feedImportSkipFlags(item.row, lookups);
        if (skipFlags.category || skipFlags.brand) {
          counts.skipped += 1;
          warningCollector.noteSkip(item.row, true, skipFlags);
          continue;
        }
        try {
          const skipVariant = item.action === "append";
          const skipProduct = productTouched.has(item.hit.productId);
          const syncLocks = feedSyncUpdateLocks(item.hit, feedLocks, campaignPriceLocks);
          const updated = await updateMatchedProduct(
            item.hit,
            item.row,
            feed,
            lookups,
            imageCache,
            updateFields,
            stockPolicy,
            skipVariant,
            skipProduct,
            syncLocks.lockPrices,
            syncLocks.lockStock,
            syncLocks.lockSaleClose,
          );
          if (updated.closed) warningCollector.noteClosed(updated.reasons);
          productTouched.add(item.hit.productId);
          if (item.action === "append") {
            const taxPercent = item.hit.taxRatePercent || lookups.defaultTaxPercent;
            const markup = Number(feed.priceMarkupPercent);
            const priced = item.row.price
              ? applyPriceRules(
                  item.row.price,
                  feed.priceIncludesTax,
                  markup,
                  asRound(feed.priceRound),
                  taxPercent,
                )
              : null;
            const discounted = item.row.discount
              ? applyPriceRules(
                  item.row.discount,
                  feed.priceIncludesTax,
                  markup,
                  asRound(feed.priceRound),
                  taxPercent,
                )
              : null;
            const compared = item.row.compareAt
              ? applyPriceRules(
                  item.row.compareAt,
                  feed.priceIncludesTax,
                  markup,
                  asRound(feed.priceRound),
                  taxPercent,
                )
              : null;
            const stored = await campaignLockedFeedPrices(
              item.hit.productId,
              resolveImportedListPrices({
                saleMinor: priced?.minor ?? 0,
                discountMinor: discounted?.minor ?? null,
                compareAtMinor: compared?.minor ?? null,
              }),
              campaignPriceLocks,
            );
            const stock = item.row.stock ? parseXmlStock(item.row.stock) : 0;
            if (item.row.sku) item.row.sku = applySkuPrefix(item.row.sku, feed.skuPrefix);
            await appendImportedVariant({
              productId: item.hit.productId,
              row: item.row,
              lookups,
              used,
              priceMinor: stored.chargeMinor,
              compareAtMinor: stored.listMinor,
              stockQuantity: stock ?? 0,
            });
          }
          seenProductIds.add(item.hit.productId);
          counts.updated += 1;
          importedAny = true;
          await yieldToEventLoop();
        } catch (error) {
          console.error(error);
          counts.failed += 1;
          pushFailure(
            failures,
            item.row,
            error instanceof Error ? error.message : "Ürün güncellenemedi.",
          );
        }
      }

      if (toCreate.length > 0) {
        await ensureImportAttributesFromRows(toCreate, lookups);
        const drafts = [];
        for (const group of groupImportRawRows(toCreate)) {
          const { draft, errors } = buildImportGroup(group, lookups, uniquesFromUsed(used));
          if (!draft) {
            counts.failed += 1;
            pushFailure(failures, group[0], errors[0] || "Ürün doğrulanamadı.");
            continue;
          }
          drafts.push({ rowNumber: group[0].rowNumber, title: draft.title, draft });
        }

        const localized = drafts.length
          ? await localizeImportedProductImagesBatch(
              drafts.map((item) => item.draft),
              imageCache,
              { keepOnFailure: true, concurrency: 3 },
            )
          : [];

        const accepted = [];
        for (const [index, result] of localized.entries()) {
          if ("error" in result) {
            counts.failed += 1;
            const source = drafts[index];
            pushFailure(failures, source ?? { rowNumber: 0, title: "" }, result.error);
            continue;
          }
          accepted.push(result.draft);
        }

        if (accepted.length > 0) {
          await ensureImportAttributeValues(accepted, used);
        }

        const prepared: Array<{
          rowNumber: number;
          title: string;
          item: PreparedImportedProduct;
        }> = [];
        for (const draft of accepted) {
          prepared.push({
            rowNumber: draft.rowNumber,
            title: draft.title,
            item: prepareImportedProduct(draft, used, sortOrder, lookups.filters),
          });
          sortOrder += 1;
        }
        if (prepared.length > 0) {
          const inserted = await insertImportedProductsSafely(
            prepared.map((entry) => entry.item),
            (item, rowError) => {
              const source = prepared.find((entry) => entry.item.productId === item.productId);
              counts.failed += 1;
              pushFailure(
                failures,
                source ?? { rowNumber: 0, title: item.product.title },
                shortenPrismaError(rowError),
              );
            },
          );
          for (const item of inserted) seenProductIds.add(item.productId);
          counts.created += inserted.length;
          if (inserted.length > 0) importedAny = true;
        }
      }

      const cursor = offset + slice.length;
      await writeRunProgress(runId, {
        itemCount: counts.items,
        createdCount: counts.created,
        updatedCount: counts.updated,
        skippedCount: counts.skipped,
        failedCount: counts.failed,
        cursor,
        seenIdsJson: JSON.stringify([...seenProductIds]),
      });
      await prisma.xmlProductFeed.update({
        where: { id: feed.id },
        data: {
          lastMessage: `${cursor} / ${counts.items} satır işlendi`,
        },
      });
      offset = cursor;
      await yieldToEventLoop();
    }

    await writeRunProgress(runId, {
      itemCount: counts.items,
      createdCount: counts.created,
      updatedCount: counts.updated,
      skippedCount: counts.skipped,
      failedCount: counts.failed,
      cursor: items.length,
      seenIdsJson: JSON.stringify([...seenProductIds]),
    });

    if (feed.deactivateMissing && feed.supplierId && seenProductIds.size > 0) {
      const owned = await prisma.product.findMany({
        where: { supplierId: feed.supplierId },
        select: { id: true },
      });
      const missing = owned
        .map((item) => item.id)
        .filter((id) => !seenProductIds.has(id) && !feedLocks.productIds.has(id));
      for (let index = 0; index < missing.length; index += 200) {
        const chunk = missing.slice(index, index + 200);
        if (chunk.length === 0) continue;
        const result = await prisma.product.updateMany({
          where: {
            id: { in: chunk },
            OR: [{ availableForOrder: true }, { isActive: true }],
          },
          data: { availableForOrder: false, isActive: false },
        });
        counts.deactivated += result.count;
        await yieldToEventLoop();
      }
    }

    if (stockPolicy.closeAllForSale && feed.supplierId) {
      for (;;) {
        const rows = await prisma.product.findMany({
          where: {
            supplierId: feed.supplierId,
            ...excludeFeedLockedProductFilter(feedLocks.productIds),
            OR: [{ availableForOrder: true }, { isActive: true }],
          },
          select: { id: true },
          take: 300,
        });
        if (rows.length === 0) break;
        const result = await prisma.product.updateMany({
          where: { id: { in: rows.map((row) => row.id) } },
          data: { availableForOrder: false, isActive: false },
        });
        counts.deactivated += result.count;
        if (result.count > 0) importedAny = true;
        await yieldToEventLoop();
      }
    }

    if (stockPolicy.deleteUnsold && feed.supplierId && items.length > 0) {
      const deleted = await deleteUnsoldSupplierProducts(feed.supplierId, feedLocks.productIds);
      counts.deleted += deleted;
      if (deleted > 0) importedAny = true;
    }

    const warningReport = warningCollector.build({
      categoryAliases: valueMaps.categories,
      brandAliases: valueMaps.brands,
      missingMappedTags,
      deactivatedMissing: counts.deactivated,
      closeAll: stockPolicy.closeAllForSale,
      ignoreVanished: items.length === 0,
    });
    const message = appendFeedSyncWarningsToRunMessage(
      formatRunFailureMessage(counts, failures),
      warningReport,
    );
    const finishedAt = new Date();
    const latestMap = await prisma.xmlProductFeed.findUnique({
      where: { id: feed.id },
      select: { categoryMapJson: true },
    });
    await prisma.xmlProductFeedRun.update({
      where: { id: runId },
      data: {
        status: "COMPLETED",
        itemCount: counts.items,
        createdCount: counts.created,
        updatedCount: counts.updated,
        skippedCount: counts.skipped,
        failedCount: counts.failed,
        deactivatedCount: counts.deactivated,
        message,
        finishedAt,
      },
    });
    await prisma.xmlProductFeed.update({
      where: { id: feed.id },
      data: {
        lastRunAt: finishedAt,
        nextRunAt: feed.isActive ? computeNextRunAt(feed.intervalMinutes, finishedAt) : null,
        lastStatus: "COMPLETED",
        lastMessage: formatFeedLastMessageWithWarnings(message, warningReport),
        lastCreatedCount: counts.created,
        lastUpdatedCount: counts.updated,
        lastSkippedCount: counts.skipped,
        lastFailedCount: counts.failed,
        categoryMapJson: mergeLastSyncWarningsIntoMapJson(
          latestMap?.categoryMapJson ?? feed.categoryMapJson,
          warningReport,
        ),
      },
    });
    if (importedAny) {
      try {
        bustCatalogCache();
      } catch (error) {
        console.error(error);
      }
    }
  } catch (error) {
    console.error(error);
    const message = shortenPrismaError(error);
    const finishedAt = new Date();
    await prisma.xmlProductFeedRun.update({
      where: { id: runId },
      data: { status: "FAILED", message, finishedAt },
    });
    await prisma.xmlProductFeed.update({
      where: { id: feed.id },
      data: {
        lastRunAt: finishedAt,
        nextRunAt: feed.isActive ? computeNextRunAt(feed.intervalMinutes, finishedAt) : null,
        lastStatus: "FAILED",
        lastMessage: message,
      },
    });
  }
}
