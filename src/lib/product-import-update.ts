import "server-only";

import { collectDescendantIds } from "@/lib/category-tree";
import {
  parseImageUrls,
  skuKey,
  type ProductImportPreviewRow,
} from "@/lib/product-import";
import { fromChargeAndListPrice, parseMajorToMinor, resolveImportedListPrices } from "@/lib/product-money";
import { normalizeProductBarcode } from "@/lib/product-barcode";
import { writeCatalogStock } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { type ProductUpdateMode } from "@/lib/product-import-update-shared";

export {
  PRODUCT_UPDATE_MODES,
  isProductUpdateMode,
  productUpdateModeLabel,
  type ProductUpdateMode,
} from "@/lib/product-import-update-shared";

export type ProductUpdateFilter = {
  categoryId: string | null;
  brandId: string | null;
};

export type ProductUpdateJobPayload = {
  kind: "update";
  mode: ProductUpdateMode;
  productId: string;
  variantId: string | null;
  urlId: number;
  title?: string;
  productSku?: string | null;
  variantSku?: string | null;
  barcode?: string | null;
  categoryId?: string | null;
  brandId?: string | null;
  priceMinor?: number | null;
  compareAtMinor?: number | null;
  stockQuantity?: number | null;
  imageUrls?: string[];
  availableForOrder?: boolean | null;
  isActive?: boolean | null;
  sourceDiscount?: string;
};

export type ProductUpdateRawRow = {
  rowNumber: number;
  productUrlId: string;
  variantId: string;
  title: string;
  variantTitle: string;
  productSku: string;
  variantSku: string;
  barcode: string;
  category: string;
  brand: string;
  price: string;
  discount: string;
  compareAt: string;
  stock: string;
  imageUrl: string;
  availableForOrder: string;
  isActive: string;
};

export function parseJobUpdatePayload(rawJson: string): ProductUpdateJobPayload | null {
  try {
    const parsed: unknown = JSON.parse(rawJson);
    if (!parsed || typeof parsed !== "object") return null;
    const value = parsed as { kind?: unknown };
    if (value.kind !== "update") return null;
    return parsed as ProductUpdateJobPayload;
  } catch {
    return null;
  }
}

function parseBooleanCell(raw: string, fallback: boolean | null) {
  const value = raw.trim().toLocaleLowerCase("tr-TR");
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

function parseStock(raw: string) {
  const value = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(value)) return null;
  return Math.max(0, value);
}

async function loadCategoryRecords() {
  return prisma.productCategory.findMany({
    select: { id: true, parentId: true, name: true, slug: true, sortOrder: true, isActive: true },
  });
}

export async function productUpdateWhere(
  filter: ProductUpdateFilter,
): Promise<Prisma.ProductWhereInput> {
  const where: Prisma.ProductWhereInput = {};
  if (filter.brandId) where.brandId = filter.brandId;
  if (filter.categoryId) {
    const categories = await loadCategoryRecords();
    const ids = collectDescendantIds(categories, filter.categoryId);
    where.categoryId = { in: [...ids] };
  }
  return where;
}

export async function countProductsForUpdate(
  filter: ProductUpdateFilter,
  mode: ProductUpdateMode,
) {
  const where = await productUpdateWhere(filter);
  const productCount = await prisma.product.count({ where });
  if (mode === "sale" || mode === "images") {
    return { productCount, rowCount: productCount };
  }
  const rowCount = await prisma.productVariant.count({
    where: { product: where },
  });
  return { productCount, rowCount };
}

export type ProductUpdateExportRow = {
  urlId: number;
  title: string;
  sku: string | null;
  availableForOrder: boolean;
  isActive: boolean;
  image: string | null;
  category: { name: string } | null;
  brand: { name: string } | null;
  images: Array<{ url: string }>;
  variants: Array<{
    id: string;
    sku: string;
    barcode: string | null;
    title: string;
    priceMinor: number;
    compareAtMinor: number | null;
    stockQuantity: number;
    image: string | null;
  }>;
};

function selectForUpdateMode(mode: ProductUpdateMode): Prisma.ProductSelect {
  const variantOrder = [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }];
  switch (mode) {
    case "stock":
      return {
        urlId: true,
        title: true,
        variants: {
          orderBy: variantOrder,
          select: { id: true, title: true, stockQuantity: true },
        },
      };
    case "price":
      return {
        urlId: true,
        title: true,
        variants: {
          orderBy: variantOrder,
          select: { id: true, title: true, priceMinor: true, compareAtMinor: true },
        },
      };
    case "sale":
      return {
        urlId: true,
        title: true,
        availableForOrder: true,
      };
    case "images":
      return {
        urlId: true,
        title: true,
        image: true,
        images: { orderBy: { sortOrder: "asc" }, select: { url: true }, take: 12 },
        variants: {
          orderBy: variantOrder,
          take: 1,
          select: { id: true, title: true, image: true },
        },
      };
    case "all":
      return {
        urlId: true,
        title: true,
        sku: true,
        availableForOrder: true,
        isActive: true,
        image: true,
        category: { select: { name: true } },
        brand: { select: { name: true } },
        images: { orderBy: { sortOrder: "asc" }, select: { url: true }, take: 12 },
        variants: {
          orderBy: variantOrder,
          select: {
            id: true,
            sku: true,
            barcode: true,
            title: true,
            priceMinor: true,
            compareAtMinor: true,
            stockQuantity: true,
            image: true,
          },
        },
      };
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

function toExportProduct(product: {
  urlId: number;
  title: string;
  sku?: string | null;
  availableForOrder?: boolean;
  isActive?: boolean;
  image?: string | null;
  category?: { name: string } | null;
  brand?: { name: string } | null;
  images?: Array<{ url: string }>;
  variants?: Array<{
    id: string;
    sku?: string;
    barcode?: string | null;
    title?: string;
    priceMinor?: number;
    compareAtMinor?: number | null;
    stockQuantity?: number;
    image?: string | null;
  }>;
}): ProductUpdateExportRow {
  return {
    urlId: product.urlId,
    title: product.title,
    sku: product.sku ?? null,
    availableForOrder: product.availableForOrder ?? true,
    isActive: product.isActive ?? true,
    image: product.image ?? null,
    category: product.category ?? null,
    brand: product.brand ?? null,
    images: product.images ?? [],
    variants: (product.variants ?? []).map((variant) => ({
      id: variant.id,
      sku: variant.sku ?? "",
      barcode: variant.barcode ?? null,
      title: variant.title ?? "",
      priceMinor: variant.priceMinor ?? 0,
      compareAtMinor: variant.compareAtMinor ?? null,
      stockQuantity: variant.stockQuantity ?? 0,
      image: variant.image ?? null,
    })),
  };
}

export async function* iterateProductsForUpdate(
  filter: ProductUpdateFilter,
  mode: ProductUpdateMode,
) {
  const where = await productUpdateWhere(filter);
  const select = selectForUpdateMode(mode);
  const batchSize = 300;
  let cursor: number | undefined;

  while (true) {
    const batch = await prisma.product.findMany({
      where: cursor == null ? where : { AND: [where, { urlId: { gt: cursor } }] },
      orderBy: { urlId: "asc" },
      take: batchSize,
      select,
    });
    if (batch.length === 0) return;
    yield batch.map((product) => toExportProduct(product as Parameters<typeof toExportProduct>[0]));
    const last = batch[batch.length - 1] as { urlId: number };
    cursor = last.urlId;
    if (batch.length < batchSize) return;
  }
}

export function updateNeedsVariant(mode: ProductUpdateMode) {
  switch (mode) {
    case "all":
    case "price":
    case "stock":
      return true;
    case "images":
    case "sale":
      return false;
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

type CatalogProduct = {
  id: string;
  urlId: number;
  sku: string | null;
  variants: Array<{
    id: string;
    sku?: string;
    barcode?: string | null;
    priceMinor?: number;
    compareAtMinor?: number | null;
  }>;
};

export function previewUpdateRows(
  rows: ProductUpdateRawRow[],
  mode: ProductUpdateMode,
  products: CatalogProduct[],
  uniques: {
    productSkuToId: Map<string, string>;
    variantSkuToId: Map<string, string>;
    barcodeToVariantId: Map<string, string>;
    categories: Array<{ id: string; name: string; slug: string }>;
    brands: Array<{ id: string; name: string; slug: string }>;
  },
): { preview: ProductImportPreviewRow; payload: ProductUpdateJobPayload | null }[] {
  const byUrlId = new Map(products.map((product) => [product.urlId, product]));
  const fileBarcodes = new Map<string, number>();
  const fileProductSkus = new Map<string, { row: number; urlId: number }>();
  const fileVariantSkus = new Map<string, number>();

  return rows.map((row) => {
    const errors: string[] = [];
    const urlId = Number.parseInt(row.productUrlId.trim(), 10);
    if (!row.productUrlId.trim()) {
      errors.push("Ürün ID zorunludur. Güncelleme ile yeni ürün eklenemez.");
    } else if (!Number.isFinite(urlId) || urlId <= 0) {
      errors.push("Ürün ID geçersiz.");
    }

    const product = Number.isFinite(urlId) ? byUrlId.get(urlId) : undefined;
    if (row.productUrlId.trim() && Number.isFinite(urlId) && !product) {
      errors.push(`Ürün ID bulunamadı (${row.productUrlId.trim()}). Yeni ürün eklenmez.`);
    }

    const variantId = row.variantId.trim();
    const variant = product?.variants.find((item) => item.id === variantId) ?? null;
    if (updateNeedsVariant(mode)) {
      if (!variantId) errors.push("Varyant ID zorunludur.");
      else if (product && !variant) errors.push("Varyant bu ürüne ait değil.");
    } else if (variantId && product && !variant) {
      errors.push("Varyant bu ürüne ait değil.");
    }

    if (mode === "all" || mode === "price") {
      if (row.price.trim() && parseMajorToMinor(row.price) == null) {
        errors.push("Satış fiyatı geçersiz.");
      }
      if (row.discount.trim() && parseMajorToMinor(row.discount) == null) {
        errors.push("İndirimli satış fiyatı geçersiz.");
      }
      if (row.compareAt.trim() && parseMajorToMinor(row.compareAt) == null) {
        errors.push("Karşılaştırma fiyatı geçersiz.");
      }
    }
    if ((mode === "all" || mode === "stock") && row.stock.trim() && parseStock(row.stock) == null) {
      errors.push("Stok geçersiz.");
    }
    if (mode === "all" || mode === "sale") {
      if (row.availableForOrder.trim() && parseBooleanCell(row.availableForOrder, null) == null) {
        errors.push("Siparişe açık alanı Evet veya Hayır olmalıdır.");
      }
    }
    if (mode === "all" && row.isActive.trim() && parseBooleanCell(row.isActive, null) == null) {
      errors.push("Aktif alanı Evet veya Hayır olmalıdır.");
    }
    if (mode === "all" || mode === "images") {
      const images = parseImageUrls(row.imageUrl);
      if (images.invalid.length > 0) {
        errors.push("Görsel URL http(s) veya /uploads/ ile başlamalı.");
      }
    }
    const category = row.category.trim()
      ? uniques.categories.find(
          (item) =>
            item.slug === row.category.trim() ||
            item.name.toLocaleLowerCase("tr-TR") === row.category.trim().toLocaleLowerCase("tr-TR"),
        )
      : null;
    if (mode === "all" && row.category.trim() && !category) {
      errors.push(`Kategori bulunamadı: ${row.category.trim()}`);
    }
    const brand = row.brand.trim()
      ? uniques.brands.find(
          (item) =>
            item.slug === row.brand.trim() ||
            item.name.toLocaleLowerCase("tr-TR") === row.brand.trim().toLocaleLowerCase("tr-TR"),
        )
      : null;
    if (mode === "all" && row.brand.trim() && !brand) {
      errors.push(`Marka bulunamadı: ${row.brand.trim()}`);
    }

    const barcode = normalizeProductBarcode(row.barcode);
    if (mode === "all" && barcode) {
      const owner = uniques.barcodeToVariantId.get(barcode);
      if (owner && owner !== (variant?.id ?? "")) {
        errors.push(`Bu barkod başka bir üründe kayıtlı (${barcode}).`);
      }
      const previous = fileBarcodes.get(barcode);
      if (previous) errors.push(`Barkod dosyada tekrar ediyor (${barcode}, satır ${previous}).`);
      else fileBarcodes.set(barcode, row.rowNumber);
    }

    const productSku = row.productSku.trim();
    if (mode === "all" && productSku) {
      const owner = uniques.productSkuToId.get(skuKey(productSku));
      if (owner && owner !== product?.id) {
        errors.push(`Ürün kodu başka bir üründe kayıtlı (${productSku}).`);
      }
      const previous = fileProductSkus.get(skuKey(productSku));
      if (previous && previous.urlId !== urlId) {
        errors.push(`Ürün kodu dosyada başka üründe de var (${productSku}, satır ${previous.row}).`);
      } else if (!previous && Number.isFinite(urlId)) {
        fileProductSkus.set(skuKey(productSku), { row: row.rowNumber, urlId });
      }
    }

    const variantSku = row.variantSku.trim();
    if (mode === "all" && variantSku) {
      const owner = uniques.variantSkuToId.get(skuKey(variantSku));
      if (owner && owner !== (variant?.id ?? "")) {
        errors.push(`SKU başka bir üründe kayıtlı (${variantSku}).`);
      }
      const previous = fileVariantSkus.get(skuKey(variantSku));
      if (previous) errors.push(`SKU dosyada tekrar ediyor (${variantSku}, satır ${previous}).`);
      else fileVariantSkus.set(skuKey(variantSku), row.rowNumber);
    }

    const ok = errors.length === 0 && Boolean(product);
    const payload: ProductUpdateJobPayload | null =
      ok && product
        ? {
            kind: "update",
            mode,
            productId: product.id,
            variantId: variant?.id ?? (variantId || null),
            urlId: product.urlId,
            title: row.title.trim() || undefined,
            productSku: productSku || null,
            variantSku: variantSku || null,
            barcode: barcode || null,
            categoryId: category?.id ?? null,
            brandId: brand?.id ?? null,
            ...(() => {
              const hasSale = Boolean(row.price.trim());
              const hasDiscount = Boolean(row.discount.trim());
              const hasCompare = Boolean(row.compareAt.trim());
              if (!hasSale && !hasDiscount && !hasCompare) {
                return { priceMinor: null, compareAtMinor: null };
              }
              const existing = variant
                ? fromChargeAndListPrice(variant.priceMinor ?? 0, variant.compareAtMinor)
                : { saleMinor: 0, discountMinor: null };
              const resolved = resolveImportedListPrices({
                saleMinor: hasSale ? (parseMajorToMinor(row.price) ?? 0) : existing.saleMinor,
                discountMinor: hasDiscount
                  ? parseMajorToMinor(row.discount)
                  : hasSale && !hasCompare
                    ? null
                    : undefined,
                compareAtMinor: !hasDiscount && hasCompare ? parseMajorToMinor(row.compareAt) : null,
              });
              return {
                priceMinor: resolved.chargeMinor,
                compareAtMinor: resolved.listMinor,
              };
            })(),
            stockQuantity: parseStock(row.stock),
            imageUrls: parseImageUrls(row.imageUrl).urls,
            availableForOrder: parseBooleanCell(row.availableForOrder, null),
            isActive: parseBooleanCell(row.isActive, null),
            sourceDiscount: row.discount.trim() || undefined,
          }
        : null;

    return {
      payload,
      preview: {
        rowNumber: row.rowNumber,
        title: row.title || product?.id || `Satır ${row.rowNumber}`,
        category: row.category,
        sku: productSku || variantSku,
        barcode,
        price: row.price,
        discount: row.discount,
        stock: row.stock,
        variantSummary: row.variantTitle,
        rowLabel: String(row.rowNumber),
        ok,
        zeroPrice: false,
        status: ok ? "ready" : "error",
        errors,
      },
    };
  });
}

async function findProductsByUrlIds(urlIds: number[], mode: ProductUpdateMode) {
  const products: CatalogProduct[] = [];
  const chunkSize = 400;
  const variantSelect = (() => {
    switch (mode) {
      case "all":
        return { id: true, sku: true, barcode: true, priceMinor: true, compareAtMinor: true };
      case "price":
        return { id: true, priceMinor: true, compareAtMinor: true };
      case "stock":
      case "images":
      case "sale":
        return { id: true };
      default: {
        const _exhaustive: never = mode;
        return _exhaustive;
      }
    }
  })();
  for (let index = 0; index < urlIds.length; index += chunkSize) {
    const slice = urlIds.slice(index, index + chunkSize);
    const batch = await prisma.product.findMany({
      where: { urlId: { in: slice } },
      select: {
        id: true,
        urlId: true,
        sku: true,
        variants: { select: variantSelect },
      },
    });
    products.push(...batch);
  }
  return products;
}

export async function loadUpdatePreviewContext(urlIds: number[], mode: ProductUpdateMode) {
  const uniqueIds = [...new Set(urlIds.filter((id) => Number.isFinite(id) && id > 0))];
  const products = uniqueIds.length ? await findProductsByUrlIds(uniqueIds, mode) : [];

  const productSkuToId = new Map<string, string>();
  const variantSkuToId = new Map<string, string>();
  const barcodeToVariantId = new Map<string, string>();
  const emptyLookups = {
    categories: [] as Array<{ id: string; name: string; slug: string }>,
    brands: [] as Array<{ id: string; name: string; slug: string }>,
  };

  if (mode !== "all") {
    return {
      products,
      uniques: { productSkuToId, variantSkuToId, barcodeToVariantId, ...emptyLookups },
    };
  }

  const [allProducts, variants, categories, brands] = await Promise.all([
    prisma.product.findMany({ select: { id: true, sku: true } }),
    prisma.productVariant.findMany({ select: { id: true, sku: true, barcode: true } }),
    prisma.productCategory.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true },
    }),
    prisma.brand.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true },
    }),
  ]);
  for (const product of allProducts) {
    if (product.sku) productSkuToId.set(skuKey(product.sku), product.id);
  }
  for (const variant of variants) {
    variantSkuToId.set(skuKey(variant.sku), variant.id);
    if (variant.barcode) {
      const key = normalizeProductBarcode(variant.barcode);
      if (key) barcodeToVariantId.set(key, variant.id);
    }
  }

  return {
    products,
    uniques: { productSkuToId, variantSkuToId, barcodeToVariantId, categories, brands },
  };
}

export async function applyProductUpdate(
  payload: ProductUpdateJobPayload,
  localizeImages: (urls: string[]) => Promise<{ urls: string[] } | { error: string }>,
) {
  switch (payload.mode) {
    case "price": {
      if (!payload.variantId) throw new Error("Varyant bulunamadı.");
      if (payload.priceMinor == null) return;
      const variant = await prisma.productVariant.update({
        where: { id: payload.variantId },
        data: {
          priceMinor: payload.priceMinor,
          compareAtMinor: payload.compareAtMinor,
        },
        select: { isDefault: true },
      });
      if (variant.isDefault) {
        await prisma.product.update({
          where: { id: payload.productId },
          data: {
            basePriceMinor: payload.priceMinor,
            compareAtMinor: payload.compareAtMinor,
          },
        });
      }
      return;
    }
    case "stock": {
      if (!payload.variantId) throw new Error("Varyant bulunamadı.");
      if (payload.stockQuantity == null) return;
      await prisma.productVariant.update({
        where: { id: payload.variantId },
        data: { stockQuantity: payload.stockQuantity },
      });
      await writeCatalogStock(prisma, payload.variantId, payload.stockQuantity, {
        note: "Toplu stok güncelleme",
      });
      return;
    }
    case "sale": {
      if (payload.availableForOrder == null) return;
      await prisma.product.update({
        where: { id: payload.productId },
        data: { availableForOrder: payload.availableForOrder },
      });
      return;
    }
    case "images": {
      if (!payload.imageUrls || payload.imageUrls.length === 0) return;
      const localized = await localizeImages(payload.imageUrls);
      if ("error" in localized) throw new Error(localized.error);
      await prisma.$transaction(async (tx) => {
        await tx.productImage.deleteMany({ where: { productId: payload.productId } });
        if (localized.urls.length > 0) {
          await tx.productImage.createMany({
            data: localized.urls.map((url, index) => ({
              productId: payload.productId,
              url,
              alt: payload.title || null,
              isCover: index === 0,
              sortOrder: index,
            })),
          });
        }
        await tx.product.update({
          where: { id: payload.productId },
          data: { image: localized.urls[0] ?? null },
        });
        if (payload.variantId && localized.urls[0]) {
          await tx.productVariant.update({
            where: { id: payload.variantId },
            data: { image: localized.urls[0] },
          });
        }
      });
      return;
    }
    case "all": {
      let imageUrls = payload.imageUrls ?? [];
      if (imageUrls.length > 0) {
        const localized = await localizeImages(imageUrls);
        if ("error" in localized) throw new Error(localized.error);
        imageUrls = localized.urls;
      }
      const isDefault = payload.variantId
        ? Boolean(
            (
              await prisma.productVariant.findFirst({
                where: { id: payload.variantId, productId: payload.productId },
                select: { isDefault: true },
              })
            )?.isDefault,
          )
        : false;

      await prisma.$transaction(async (tx) => {
        await tx.product.update({
          where: { id: payload.productId },
          data: {
            ...(payload.title ? { title: payload.title.slice(0, 191) } : {}),
            ...(payload.productSku ? { sku: payload.productSku.slice(0, 80) } : {}),
            ...(payload.categoryId ? { categoryId: payload.categoryId } : {}),
            ...(payload.brandId ? { brandId: payload.brandId } : {}),
            ...(payload.availableForOrder != null
              ? { availableForOrder: payload.availableForOrder }
              : {}),
            ...(payload.isActive != null ? { isActive: payload.isActive } : {}),
            ...(payload.priceMinor != null && isDefault
              ? { basePriceMinor: payload.priceMinor, compareAtMinor: payload.compareAtMinor }
              : {}),
            ...(imageUrls.length > 0 ? { image: imageUrls[0] } : {}),
          },
        });
        if (payload.variantId) {
          await tx.productVariant.update({
            where: { id: payload.variantId },
            data: {
              ...(payload.variantSku ? { sku: payload.variantSku.slice(0, 80) } : {}),
              ...(payload.barcode ? { barcode: normalizeProductBarcode(payload.barcode) } : {}),
              ...(payload.priceMinor != null
                ? { priceMinor: payload.priceMinor, compareAtMinor: payload.compareAtMinor }
                : {}),
              ...(payload.stockQuantity != null ? { stockQuantity: payload.stockQuantity } : {}),
              ...(imageUrls[0] ? { image: imageUrls[0] } : {}),
            },
          });
          if (payload.stockQuantity != null) {
            await writeCatalogStock(tx, payload.variantId, payload.stockQuantity, {
              note: "Toplu stok güncelleme",
            });
          }
        }
        if (imageUrls.length > 0) {
          await tx.productImage.deleteMany({ where: { productId: payload.productId } });
          await tx.productImage.createMany({
            data: imageUrls.map((url, index) => ({
              productId: payload.productId,
              url,
              alt: payload.title || null,
              isCover: index === 0,
              sortOrder: index,
            })),
          });
        }
      });
      return;
    }
    default: {
      const _exhaustive: never = payload.mode;
      return _exhaustive;
    }
  }
}
