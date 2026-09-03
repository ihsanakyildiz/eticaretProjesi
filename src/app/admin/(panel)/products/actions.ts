"use server";

import { revalidatePath } from "next/cache";
import { bustCatalogCache } from "@/lib/catalog-products";
import { requirePermission } from "@/lib/staff-permissions";
import {
  isProductEstimatedDelivery,
  isProductOutOfStockBehavior,
  isProductSaleUnit,
  isProductVisibility,
  type ProductAttachmentDraft,
  type ProductFeatureDraft,
  type ProductVariantDraft,
} from "@/lib/product-editor";
import {
  loadProductListVariants,
  type ProductListVariantRow,
} from "@/lib/admin-product-list";
import { parseMajorToMinor } from "@/lib/product-money";
import {
  clearedSaleWrite,
  listPriceMinor,
  parseSaleWindow,
  ratioChargeMinor,
  storedSaleWrite,
  toIsoOrNull,
} from "@/lib/product-sale";
import { syncProductSaleFromDefault } from "@/lib/product-sale-expire";
import { isAdvancedInventoryEnabled } from "@/lib/advanced-inventory";
import { writeCatalogStock } from "@/lib/inventory";
import { pruneIncompleteCombinations } from "@/lib/product-combinations";
import { prisma } from "@/lib/prisma";
import {
  buildVariantCombinationKey,
  DEFAULT_VARIANT_COMBINATION_KEY,
  formatVariantTitle,
} from "@/lib/product-variants";
import { slugify } from "@/lib/slug";
import { normalizeProductBarcode } from "@/lib/product-barcode";
import { variantDraftBarcodeError, invalidateDuplicateBarcodeCount } from "@/lib/product-barcode-db";
import {
  deletePublicAsset,
  saveOptimizedImage,
  savePublicUpload,
  uploadLimits,
} from "@/lib/uploads";

export type ProductFormState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
  redirectId?: string;
};

function revalidateProductAdmin(id?: string, slug?: string) {
  revalidatePath("/admin/products");
  revalidatePath("/admin/products/duplicate-barcodes");
  revalidatePath("/", "layout");
  revalidatePath("/katalog");
  revalidatePath("/kategori");
  revalidatePath("/marka");
  revalidatePath("/arama");
  revalidatePath("/magaza");
  revalidatePath("/urunler");
  bustCatalogCache();
  if (id) revalidatePath(`/admin/products/${id}/edit`);
  if (slug) {
    revalidatePath(`/${slug}`);
    revalidatePath(`/urun/${slug}`);
    revalidatePath(`/urunler/${slug}`);
  }
}

function emptyToNull(value: string, max = 191) {
  const trimmed = value.trim().slice(0, max);
  return trimmed || null;
}

function emptyHtml(html: string): string | null {
  const stripped = html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .trim();
  return stripped ? html.trim() : null;
}

function parseOptionalDecimal(raw: string) {
  const normalized = raw.trim().replace(",", ".");
  if (!normalized) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

async function uniqueProductSlug(base: string, excludeId?: string) {
  const slug = slugify(base) || "urun";
  let candidate = slug;
  let i = 2;
  while (true) {
    const existing = await prisma.product.findFirst({
      where: {
        slug: candidate,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (!existing) return candidate;
    candidate = `${slug}-${i}`;
    i += 1;
  }
}

async function uniqueProductSku(base: string, excludeProductId?: string) {
  const sku = (base.trim() || "SKU").slice(0, 80);
  let candidate = sku;
  let i = 2;
  while (true) {
    const existing = await prisma.product.findFirst({
      where: {
        sku: candidate,
        ...(excludeProductId ? { NOT: { id: excludeProductId } } : {}),
      },
      select: { id: true },
    });
    if (!existing) return candidate;
    candidate = `${sku}-${i}`.slice(0, 80);
    i += 1;
  }
}

async function uniqueVariantSku(base: string, excludeVariantId?: string) {
  const sku = (base.trim() || "SKU").slice(0, 80);
  let candidate = sku;
  let i = 2;
  while (true) {
    const existing = await prisma.productVariant.findFirst({
      where: {
        sku: candidate,
        ...(excludeVariantId ? { NOT: { id: excludeVariantId } } : {}),
      },
      select: { id: true },
    });
    if (!existing) return candidate;
    candidate = `${sku}-${i}`.slice(0, 80);
    i += 1;
  }
}

function parseJsonArray<T>(raw: string, fallback: T[]): T[] {
  if (!raw.trim()) return fallback;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function parseFeatures(raw: string): ProductFeatureDraft[] {
  return parseJsonArray<ProductFeatureDraft>(raw, []).filter((item) => item?.filterId);
}

function parseVariants(raw: string): ProductVariantDraft[] {
  return parseJsonArray<ProductVariantDraft>(raw, []).filter(
    (item) => item && typeof item.sku === "string" && typeof item.combinationKey === "string",
  );
}

type ImageKeep = {
  id?: string;
  url?: string;
  isCover: boolean;
  sortOrder: number;
  alt?: string | null;
  hasFile?: boolean;
  remove?: boolean;
};

function isVariantOwnedImage(url: string | null | undefined) {
  return (url ?? "").includes("/uploads/products/variants/");
}

function publicAssetPath(raw: string | null | undefined) {
  const value = (raw ?? "").trim();
  if (!value || value.startsWith("blob:") || value.startsWith("data:")) return null;
  return value.slice(0, 500);
}

function collectVariantImageFiles(formData: FormData) {
  const files = new Map<string, File>();
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("variant_image_")) continue;
    if (value instanceof File && value.size > 0) {
      files.set(key.slice("variant_image_".length), value);
    }
  }
  return files;
}

async function resolveVariantImage(
  draft: ProductVariantDraft,
  existingImage: string | null | undefined,
  file: File | undefined,
) {
  if (file) {
    const saved = await saveOptimizedImage(file, {
      uploadDir: "uploads/products/variants",
      maxBytes: uploadLimits.image,
      mode: "webp",
      quality: 82,
      previousPath: isVariantOwnedImage(existingImage) ? existingImage ?? undefined : undefined,
    });
    return saved.publicPath;
  }

  if (draft.imageRemoved) {
    if (isVariantOwnedImage(existingImage) && existingImage) {
      await deletePublicAsset(existingImage);
    }
    return null;
  }

  const next = publicAssetPath(draft.image);
  if (!next) return existingImage ?? null;
  if (next !== existingImage && isVariantOwnedImage(existingImage) && existingImage) {
    await deletePublicAsset(existingImage);
  }
  return next;
}

async function syncImages(
  productId: string,
  keeps: ImageKeep[],
  files: File[],
) {
  const existing = await prisma.productImage.findMany({
    where: { productId },
    select: { id: true, url: true },
  });
  const ordered = [...keeps]
    .filter((item) => !item.remove)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const keepIds = new Set(ordered.map((item) => item.id).filter((id): id is string => Boolean(id)));

  for (const row of existing) {
    if (!keepIds.has(row.id)) {
      await prisma.productImage.delete({ where: { id: row.id } });
      await deletePublicAsset(row.url);
    }
  }

  let sort = 0;
  let coverUrl: string | null = null;
  let fileIndex = 0;

  for (const item of ordered) {
    const alt = emptyToNull(String(item.alt ?? ""), 191);
    if (item.id) {
      const isCover = Boolean(item.isCover);
      await prisma.productImage.update({
        where: { id: item.id },
        data: { isCover, sortOrder: sort, alt },
      });
      if (isCover) coverUrl = item.url ?? null;
      sort += 1;
      continue;
    }

    if (!item.hasFile) continue;
    const file = files[fileIndex];
    fileIndex += 1;
    if (!(file instanceof File) || file.size === 0) continue;

    const saved = await saveOptimizedImage(file, {
      uploadDir: "uploads/products/catalog",
      maxBytes: uploadLimits.image,
      mode: "webp",
      quality: 82,
    });
    const isCover = Boolean(item.isCover);
    await prisma.productImage.create({
      data: {
        productId,
        url: saved.publicPath,
        alt,
        isCover,
        sortOrder: sort,
      },
    });
    if (isCover) coverUrl = saved.publicPath;
    sort += 1;
  }

  const images = await prisma.productImage.findMany({
    where: { productId },
    orderBy: { sortOrder: "asc" },
  });
  if (images.length && !images.some((image) => image.isCover)) {
    await prisma.productImage.update({
      where: { id: images[0].id },
      data: { isCover: true },
    });
    coverUrl = images[0].url;
  } else {
    coverUrl = images.find((image) => image.isCover)?.url ?? images[0]?.url ?? null;
  }

  await prisma.product.update({
    where: { id: productId },
    data: { image: coverUrl },
  });
}

const ATTACHMENT_MIME = [
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".pdf",
  ".zip",
  ".doc",
  ".docx",
];
const ATTACHMENT_MAX_BYTES = 8 * 1024 * 1024;

function isOwnedAttachment(url: string | null | undefined) {
  return (url ?? "").includes("/uploads/products/attachments/");
}

async function syncAttachments(
  productId: string,
  drafts: ProductAttachmentDraft[],
  files: File[],
) {
  const existing = await prisma.productAttachment.findMany({
    where: { productId },
    select: { id: true, url: true },
  });
  const ordered = [...drafts].sort((a, b) => a.sortOrder - b.sortOrder);
  const keepIds = new Set(ordered.map((item) => item.id).filter((id): id is string => Boolean(id)));

  for (const row of existing) {
    if (!keepIds.has(row.id)) {
      await prisma.productAttachment.delete({ where: { id: row.id } });
      if (isOwnedAttachment(row.url)) await deletePublicAsset(row.url);
    }
  }

  let sort = 0;
  let fileIndex = 0;
  for (const item of ordered) {
    const name = (item.name || "Dosya").trim().slice(0, 191) || "Dosya";
    if (item.id) {
      await prisma.productAttachment.update({
        where: { id: item.id },
        data: { name, sortOrder: sort },
      });
      sort += 1;
      continue;
    }
    if (!item.hasFile) continue;
    const file = files[fileIndex];
    fileIndex += 1;
    if (!(file instanceof File) || file.size === 0) continue;
    const saved = await savePublicUpload(file, {
      uploadDir: "uploads/products/attachments",
      allowedMime: ATTACHMENT_MIME,
      maxBytes: ATTACHMENT_MAX_BYTES,
    });
    await prisma.productAttachment.create({
      data: {
        productId,
        url: saved.publicPath,
        name,
        sortOrder: sort,
      },
    });
    sort += 1;
  }
}

async function syncRelated(productId: string, relatedIds: string[]) {
  const unique = [...new Set(relatedIds.map((id) => id.trim()).filter(Boolean))].filter(
    (id) => id !== productId,
  );
  await prisma.productRelated.deleteMany({ where: { productId } });
  if (!unique.length) return;

  const existing = await prisma.product.findMany({
    where: { id: { in: unique } },
    select: { id: true },
  });
  const allowed = new Set(existing.map((row) => row.id));
  await prisma.productRelated.createMany({
    data: unique
      .filter((id) => allowed.has(id))
      .map((relatedId, index) => ({
        productId,
        relatedId,
        sortOrder: index,
      })),
  });
}

async function syncFeatures(productId: string, features: ProductFeatureDraft[]) {
  await prisma.productFilterAssignment.deleteMany({ where: { productId } });
  const rows = features
    .map((feature) => ({
      productId,
      filterId: String(feature.filterId),
      valueId: feature.valueId ? String(feature.valueId) : null,
      numberValue:
        feature.numberValue === null || feature.numberValue === undefined
          ? null
          : Number(feature.numberValue),
      booleanValue:
        feature.booleanValue === null || feature.booleanValue === undefined
          ? null
          : Boolean(feature.booleanValue),
    }))
    .filter((row) => row.filterId);

  if (rows.length) {
    await prisma.productFilterAssignment.createMany({ data: rows });
  }
}

async function syncVariants(
  productId: string,
  drafts: ProductVariantDraft[],
  basePriceMinor: number,
  imageFiles: Map<string, File>,
) {
  const pruned = pruneIncompleteCombinations(drafts);
  const defaultIndex = (() => {
    const pricedDefault = pruned.findIndex((item) => item.isDefault && item.priceMinor > 0);
    if (pricedDefault >= 0) return pricedDefault;
    const anyDefault = pruned.findIndex((item) => item.isDefault);
    if (anyDefault >= 0) return anyDefault;
    const priced = pruned.findIndex((item) => item.priceMinor > 0);
    return priced >= 0 ? priced : 0;
  })();
  const normalized = pruned.map((item, index) => ({
    ...item,
    isDefault: pruned.length > 0 ? index === defaultIndex : item.isDefault,
    priceMinor: item.priceMinor > 0 ? item.priceMinor : basePriceMinor,
  }));
  const lockCatalogStock = await isAdvancedInventoryEnabled();
  const existing = await prisma.productVariant.findMany({
    where: { productId },
    select: { id: true, sku: true, combinationKey: true, image: true, stockQuantity: true },
  });
  const incomingIds = new Set(
    normalized.map((item) => item.id).filter((id): id is string => Boolean(id)),
  );
  const incomingKeys = new Set(normalized.map((item) => item.combinationKey).filter(Boolean));

  for (const row of existing) {
    const keep = incomingIds.has(row.id) || incomingKeys.has(row.combinationKey);
    if (!keep && normalized.length > 0) {
      if (isVariantOwnedImage(row.image) && row.image) {
        await deletePublicAsset(row.image);
      }
      await prisma.productVariant.delete({ where: { id: row.id } });
    }
  }

  const defaultDraft: ProductVariantDraft = {
    clientKey: "default",
    sku: "SKU",
    title: formatVariantTitle([]),
    priceMinor: basePriceMinor,
    stockQuantity: 0,
    isDefault: true,
    isActive: true,
    combinationKey: DEFAULT_VARIANT_COMBINATION_KEY,
    selections: [],
  };
  const existingDefault = existing.find(
    (row) => row.combinationKey === DEFAULT_VARIANT_COMBINATION_KEY,
  );
  if (existingDefault) defaultDraft.id = existingDefault.id;

  const effective = normalized.length > 0 ? normalized : [defaultDraft];

  if (!effective.some((item) => item.isDefault)) {
    effective[0].isDefault = true;
  }

  const seenKeys = new Set<string>();
  for (const draft of effective) {
    const selections = (draft.selections ?? []).map((item) => ({
      attributeId: String(item.attributeId),
      valueId: String(item.valueId),
    }));
    const combinationKey =
      selections.length === 0
        ? DEFAULT_VARIANT_COMBINATION_KEY
        : buildVariantCombinationKey(selections);
    if (seenKeys.has(combinationKey)) continue;
    seenKeys.add(combinationKey);

    const priceMinor =
      Number.isFinite(draft.priceMinor) && draft.priceMinor >= 0
        ? Math.round(draft.priceMinor)
        : basePriceMinor;
    const requestedStock = Number.isFinite(draft.stockQuantity)
      ? Math.max(0, Math.round(draft.stockQuantity))
      : 0;
    const compareAtMinor =
      draft.compareAtMinor == null || !Number.isFinite(draft.compareAtMinor)
        ? null
        : Math.max(0, Math.round(draft.compareAtMinor));

    let variantId = draft.id;
    if (!variantId) {
      variantId = existing.find((row) => row.combinationKey === combinationKey)?.id;
    }
    const sku = await uniqueVariantSku(draft.sku || combinationKey.slice(0, 12), variantId);
    const previous = existing.find((row) => row.id === variantId);
    const stockQuantity = lockCatalogStock ? (previous?.stockQuantity ?? 0) : requestedStock;
    const uploaded =
      imageFiles.get(draft.clientKey) ?? (draft.id ? imageFiles.get(draft.id) : undefined);
    const image = await resolveVariantImage(draft, previous?.image, uploaded);

    const data = {
      sku,
      barcode: normalizeProductBarcode(draft.barcode ?? ""),
      title: (draft.title || formatVariantTitle([])).slice(0, 191),
      priceMinor,
      compareAtMinor,
      stockQuantity,
      trackInventory: draft.trackInventory !== false,
      allowBackorder: Boolean(draft.allowBackorder),
      isDefault: Boolean(draft.isDefault),
      isActive: draft.isActive !== false,
      image,
      combinationKey,
    };

    if (variantId && existing.some((row) => row.id === variantId)) {
      await prisma.productVariant.update({
        where: { id: variantId },
        data,
      });
      await prisma.productVariantSelection.deleteMany({ where: { variantId } });
    } else {
      const created = await prisma.productVariant.create({
        data: { productId, ...data },
      });
      variantId = created.id;
    }

    if (variantId && !lockCatalogStock) {
      await writeCatalogStock(prisma, variantId, stockQuantity, {
        note: "Ürün formu stok güncellemesi",
      });
    }

    if (selections.length && variantId) {
      await prisma.productVariantSelection.createMany({
        data: selections.map((item) => ({
          variantId,
          attributeId: item.attributeId,
          valueId: item.valueId,
        })),
      });
    }
  }

  if (drafts.length === 0) {
    const leftovers = await prisma.productVariant.findMany({
      where: {
        productId,
        combinationKey: { not: DEFAULT_VARIANT_COMBINATION_KEY },
      },
      select: { id: true, image: true },
    });
    for (const row of leftovers) {
      if (isVariantOwnedImage(row.image) && row.image) {
        await deletePublicAsset(row.image);
      }
      await prisma.productVariant.delete({ where: { id: row.id } });
    }
  }
}

function parseProductFields(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const summary = emptyHtml(String(formData.get("summary") ?? ""));
  const content = emptyHtml(String(formData.get("content") ?? ""));
  const categoryId = emptyToNull(String(formData.get("categoryId") ?? ""));
  const brandId = emptyToNull(String(formData.get("brandId") ?? ""));
  const supplierId = emptyToNull(String(formData.get("supplierId") ?? ""));
  const sku = emptyToNull(String(formData.get("sku") ?? ""));
  const visibilityRaw = String(formData.get("visibility") ?? "EVERYWHERE");
  const outRaw = String(formData.get("outOfStockBehavior") ?? "DEFAULT");
  const taxRate = Number.parseInt(String(formData.get("taxRatePercent") ?? ""), 10);
  const sortOrder = Number.parseInt(String(formData.get("sortOrder") ?? "0"), 10);
  const basePriceMinor =
    parseMajorToMinor(String(formData.get("basePriceMajor") ?? "0")) ?? 0;
  const compareAtMinor = parseMajorToMinor(String(formData.get("compareAtMajor") ?? ""));
  const costMinor = parseMajorToMinor(String(formData.get("costMajor") ?? ""));
  const extraShippingMinor =
    parseMajorToMinor(String(formData.get("extraShippingMajor") ?? "0")) ?? 0;
  const estimatedDeliveryRaw = String(formData.get("estimatedDelivery") ?? "").trim();
  const saleUnitRaw = String(formData.get("saleUnit") ?? "PIECE");
  const minOrderQty = Number.parseInt(String(formData.get("minOrderQty") ?? "1"), 10);
  const quantityStep = Number.parseInt(String(formData.get("quantityStep") ?? "1"), 10);
  const saveIntent = String(formData.get("saveIntent") ?? "").trim();
  const isActive =
    saveIntent === "draft"
      ? false
      : saveIntent === "publish"
        ? true
        : formData.get("isActive") === "on" || formData.get("isActive") === "true";

  return {
    title,
    slugInput,
    summary,
    content,
    categoryId,
    brandId,
    supplierId,
    sku,
    mpn: emptyToNull(String(formData.get("mpn") ?? ""), 64),
    upc: emptyToNull(String(formData.get("upc") ?? ""), 64),
    gtin: emptyToNull(String(formData.get("gtin") ?? ""), 64),
    isbn: emptyToNull(String(formData.get("isbn") ?? ""), 32),
    visibility: isProductVisibility(visibilityRaw) ? visibilityRaw : "EVERYWHERE",
    outOfStockBehavior: isProductOutOfStockBehavior(outRaw) ? outRaw : "DEFAULT",
    taxRatePercent: Number.isFinite(taxRate) ? Math.min(100, Math.max(0, taxRate)) : 0,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    basePriceMinor,
    compareAtMinor,
    costMinor,
    extraShippingMinor,
    estimatedDelivery: isProductEstimatedDelivery(estimatedDeliveryRaw)
      ? estimatedDeliveryRaw
      : null,
    saleUnit: isProductSaleUnit(saleUnitRaw) ? saleUnitRaw : "PIECE",
    minOrderQty:
      Number.isFinite(minOrderQty) && minOrderQty > 0 ? Math.min(99999, minOrderQty) : 1,
    quantityStep:
      Number.isFinite(quantityStep) && quantityStep > 0 ? Math.min(99999, quantityStep) : 1,
    widthCm: parseOptionalDecimal(String(formData.get("widthCm") ?? "")),
    heightCm: parseOptionalDecimal(String(formData.get("heightCm") ?? "")),
    depthCm: parseOptionalDecimal(String(formData.get("depthCm") ?? "")),
    weightKg: parseOptionalDecimal(String(formData.get("weightKg") ?? "")),
    isActive,
    availableForOrder:
      formData.get("availableForOrder") === "on" ||
      formData.get("availableForOrder") === "true",
    showPrice: formData.get("showPrice") === "on" || formData.get("showPrice") === "true",
    onlineOnly: formData.get("onlineOnly") === "on" || formData.get("onlineOnly") === "true",
    onSale: formData.get("onSale") === "on" || formData.get("onSale") === "true",
    inStockLabel: emptyToNull(String(formData.get("inStockLabel") ?? "")),
    outOfStockLabel: emptyToNull(String(formData.get("outOfStockLabel") ?? "")),
    seoTitle: emptyToNull(String(formData.get("seoTitle") ?? "")),
    seoDescription: emptyToNull(String(formData.get("seoDescription") ?? ""), 500),
    features: parseFeatures(String(formData.get("featuresJson") ?? "")),
    variants: parseVariants(String(formData.get("variantsJson") ?? "")),
    images: parseJsonArray<ImageKeep>(String(formData.get("imagesJson") ?? ""), []),
    attachments: parseJsonArray<ProductAttachmentDraft>(
      String(formData.get("attachmentsJson") ?? ""),
      [],
    ),
    relatedIds: parseJsonArray<string>(String(formData.get("relatedIdsJson") ?? ""), []).filter(
      (id) => typeof id === "string" && id.trim().length > 0,
    ),
    galleryFiles: formData.getAll("gallery_files"),
    attachmentFiles: formData.getAll("attachment_files"),
    variantImageFiles: collectVariantImageFiles(formData),
  };
}

async function productCoreData(
  fields: ReturnType<typeof parseProductFields>,
  excludeId?: string,
) {
  const slug = await uniqueProductSlug(fields.slugInput || fields.title, excludeId);
  const sku = fields.sku ? await uniqueProductSku(fields.sku, excludeId) : null;
  return {
    title: fields.title,
    slug,
    summary: fields.summary,
    content: fields.content,
    categoryId: fields.categoryId,
    brandId: fields.brandId,
    supplierId: fields.supplierId,
    sku,
    mpn: fields.mpn,
    upc: fields.upc,
    gtin: fields.gtin,
    isbn: fields.isbn,
    basePriceMinor: fields.basePriceMinor,
    compareAtMinor: fields.compareAtMinor,
    costMinor: fields.costMinor,
    taxRatePercent: fields.taxRatePercent,
    widthCm: fields.widthCm,
    heightCm: fields.heightCm,
    depthCm: fields.depthCm,
    weightKg: fields.weightKg,
    extraShippingMinor: fields.extraShippingMinor,
    estimatedDelivery: fields.estimatedDelivery,
    saleUnit: fields.saleUnit,
    minOrderQty: fields.minOrderQty,
    quantityStep: fields.quantityStep,
    visibility: fields.visibility,
    availableForOrder: fields.availableForOrder,
    showPrice: fields.showPrice,
    onlineOnly: fields.onlineOnly,
    onSale: fields.onSale,
    outOfStockBehavior: fields.outOfStockBehavior,
    inStockLabel: fields.inStockLabel,
    outOfStockLabel: fields.outOfStockLabel,
    isActive: fields.isActive,
    sortOrder: fields.sortOrder,
    seoTitle: fields.seoTitle,
    seoDescription: fields.seoDescription,
  };
}

export async function createProductAction(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const gate = await requirePermission("products", "create");
  if (!gate.ok) return { error: gate.error };

  const fields = parseProductFields(formData);
  if (!fields.title) {
    return { error: "Ürün adı zorunludur.", fieldErrors: { title: "Zorunlu alan" } };
  }
  if (!fields.categoryId) {
    return { error: "Kategori seçin.", fieldErrors: { categoryId: "Kategori zorunludur" } };
  }

  const barcodeError = await variantDraftBarcodeError(fields.variants);
  if (barcodeError) return { error: barcodeError };

  try {
    let sortOrder = fields.sortOrder;
    if (!String(formData.get("sortOrder") ?? "").trim()) {
      const last = await prisma.product.findFirst({
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      sortOrder = (last?.sortOrder ?? -1) + 1;
    }

    const data = await productCoreData({ ...fields, sortOrder });
    const created = await prisma.product.create({ data });

    const files = fields.galleryFiles.filter((item): item is File => item instanceof File);
    const attachmentFiles = fields.attachmentFiles.filter(
      (item): item is File => item instanceof File,
    );
    await syncImages(created.id, fields.images, files);
    await syncAttachments(created.id, fields.attachments, attachmentFiles);
    await syncRelated(created.id, fields.relatedIds);
    await syncFeatures(created.id, fields.features);
    await syncVariants(created.id, fields.variants, fields.basePriceMinor, fields.variantImageFiles);

    invalidateDuplicateBarcodeCount();
    revalidateProductAdmin(created.id, created.slug);
    return { success: true, message: "Ürün oluşturuldu.", redirectId: created.id };
  } catch (error) {
    console.error(error);
    return { error: "Ürün kaydedilirken bir hata oluştu." };
  }
}

export async function updateProductAction(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const gate = await requirePermission("products", "update");
  if (!gate.ok) return { error: gate.error };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Ürün bulunamadı." };

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return { error: "Ürün bulunamadı." };

  const fields = parseProductFields(formData);
  if (!fields.title) {
    return { error: "Ürün adı zorunludur.", fieldErrors: { title: "Zorunlu alan" } };
  }
  if (!fields.categoryId) {
    return { error: "Kategori seçin.", fieldErrors: { categoryId: "Kategori zorunludur" } };
  }

  try {
    const existingVariants = await prisma.productVariant.findMany({
      where: { productId: id },
      select: { id: true },
    });
    const barcodeError = await variantDraftBarcodeError(fields.variants, {
      excludeVariantIds: existingVariants.map((row) => row.id),
    });
    if (barcodeError) return { error: barcodeError };

    const data = await productCoreData(fields, id);
    await prisma.product.update({ where: { id }, data });

    const files = fields.galleryFiles.filter((item): item is File => item instanceof File);
    const attachmentFiles = fields.attachmentFiles.filter(
      (item): item is File => item instanceof File,
    );
    await syncImages(id, fields.images, files);
    await syncAttachments(id, fields.attachments, attachmentFiles);
    await syncRelated(id, fields.relatedIds);
    await syncFeatures(id, fields.features);
    await syncVariants(id, fields.variants, fields.basePriceMinor, fields.variantImageFiles);

    invalidateDuplicateBarcodeCount();
    revalidateProductAdmin(id, data.slug);
    if (existing.slug !== data.slug) {
      revalidatePath(`/${existing.slug}`);
      revalidatePath(`/urun/${existing.slug}`);
      revalidatePath(`/urunler/${existing.slug}`);
    }
    return { success: true, message: "Ürün güncellendi." };
  } catch (error) {
    console.error(error);
    return { error: "Ürün güncellenirken bir hata oluştu." };
  }
}

export async function deleteProductAction(input: { id: string }) {
  const gate = await requirePermission("products", "delete");
  if (!gate.ok) return { error: gate.error };

  const id = String(input.id ?? "").trim();
  if (!id) return { error: "Ürün bulunamadı." };

  const existing = await prisma.product.findUnique({
    where: { id },
    include: {
      images: { select: { url: true } },
      variants: { select: { image: true } },
      attachments: { select: { url: true } },
    },
  });
  if (!existing) return { error: "Ürün bulunamadı." };

  try {
    await prisma.product.delete({ where: { id } });
    if (existing.image) await deletePublicAsset(existing.image);
    for (const image of existing.images) {
      if (image.url !== existing.image) await deletePublicAsset(image.url);
    }
    for (const variant of existing.variants) {
      if (isVariantOwnedImage(variant.image) && variant.image) {
        await deletePublicAsset(variant.image);
      }
    }
    for (const attachment of existing.attachments) {
      if (isOwnedAttachment(attachment.url)) await deletePublicAsset(attachment.url);
    }
    revalidateProductAdmin(undefined, existing.slug);
    return { success: true, message: "Ürün silindi." };
  } catch (error) {
    console.error(error);
    return { error: "Ürün silinirken bir hata oluştu." };
  }
}

export async function toggleProductActiveAction(input: { id: string; isActive: boolean }) {
  const gate = await requirePermission("products", "update");
  if (!gate.ok) return { error: gate.error };

  const id = String(input.id ?? "").trim();
  if (!id) return { error: "Ürün bulunamadı." };

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return { error: "Ürün bulunamadı." };

  await prisma.product.update({
    where: { id },
    data: { isActive: input.isActive },
  });
  revalidateProductAdmin(id, existing.slug);
  return {
    success: true,
    message: input.isActive ? "Ürün yayında." : "Ürün taslağa alındı.",
  };
}

export async function duplicateProductAction(input: { id: string }): Promise<{
  success?: boolean;
  error?: string;
  redirectId?: string;
}> {
  const gate = await requirePermission("products", "create");
  if (!gate.ok) return { error: gate.error };

  const id = String(input.id ?? "").trim();
  if (!id) return { error: "Ürün bulunamadı." };

  const source = await prisma.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      attachments: { orderBy: { sortOrder: "asc" } },
      filterAssignments: true,
      relatedFrom: { orderBy: { sortOrder: "asc" } },
      variants: {
        orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }],
        include: { selections: true },
      },
    },
  });
  if (!source) return { error: "Ürün bulunamadı." };

  try {
    const last = await prisma.product.findFirst({
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const title = `${source.title} (kopya)`.slice(0, 191);
    const slug = await uniqueProductSlug(`${source.slug}-kopya`);
    const sku = source.sku ? await uniqueProductSku(`${source.sku}-KPY`) : null;

    const created = await prisma.product.create({
      data: {
        title,
        slug,
        summary: source.summary,
        content: source.content,
        image: source.image,
        categoryId: source.categoryId,
        brandId: source.brandId,
        supplierId: source.supplierId,
        sku,
        mpn: source.mpn,
        upc: source.upc,
        gtin: source.gtin,
        isbn: source.isbn,
        basePriceMinor: source.basePriceMinor,
        compareAtMinor: source.compareAtMinor,
        saleStartsAt: source.saleStartsAt,
        saleEndsAt: source.saleEndsAt,
        costMinor: source.costMinor,
        taxRatePercent: source.taxRatePercent,
        widthCm: source.widthCm,
        heightCm: source.heightCm,
        depthCm: source.depthCm,
        weightKg: source.weightKg,
        extraShippingMinor: source.extraShippingMinor,
        estimatedDelivery: source.estimatedDelivery,
        visibility: source.visibility,
        availableForOrder: source.availableForOrder,
        showPrice: source.showPrice,
        onlineOnly: source.onlineOnly,
        onSale: source.onSale,
        outOfStockBehavior: source.outOfStockBehavior,
        inStockLabel: source.inStockLabel,
        outOfStockLabel: source.outOfStockLabel,
        saleUnit: source.saleUnit,
        minOrderQty: source.minOrderQty,
        quantityStep: source.quantityStep,
        isActive: false,
        sortOrder: (last?.sortOrder ?? -1) + 1,
        seoTitle: source.seoTitle,
        seoDescription: source.seoDescription,
      },
    });

    if (source.images.length) {
      await prisma.productImage.createMany({
        data: source.images.map((image) => ({
          productId: created.id,
          url: image.url,
          alt: image.alt,
          isCover: image.isCover,
          sortOrder: image.sortOrder,
        })),
      });
    }

    if (source.attachments.length) {
      await prisma.productAttachment.createMany({
        data: source.attachments.map((row) => ({
          productId: created.id,
          url: row.url,
          name: row.name,
          sortOrder: row.sortOrder,
        })),
      });
    }

    if (source.filterAssignments.length) {
      await prisma.productFilterAssignment.createMany({
        data: source.filterAssignments.map((row) => ({
          productId: created.id,
          filterId: row.filterId,
          valueId: row.valueId,
          numberValue: row.numberValue,
          booleanValue: row.booleanValue,
        })),
      });
    }

    if (source.relatedFrom.length) {
      await prisma.productRelated.createMany({
        data: source.relatedFrom
          .filter((row) => row.relatedId !== created.id)
          .map((row) => ({
            productId: created.id,
            relatedId: row.relatedId,
            sortOrder: row.sortOrder,
          })),
      });
    }

    const lockCatalogStock = await isAdvancedInventoryEnabled();
    for (const variant of source.variants) {
      const copiedSku = await uniqueVariantSku(`${variant.sku}-KPY`);
      const copiedStock = lockCatalogStock ? 0 : variant.stockQuantity;
      const createdVariant = await prisma.productVariant.create({
        data: {
          productId: created.id,
          sku: copiedSku,
          barcode: null,
          title: variant.title,
          priceMinor: variant.priceMinor,
          compareAtMinor: variant.compareAtMinor,
          saleStartsAt: variant.saleStartsAt,
          saleEndsAt: variant.saleEndsAt,
          stockQuantity: copiedStock,
          trackInventory: variant.trackInventory,
          allowBackorder: variant.allowBackorder,
          isActive: variant.isActive,
          isDefault: variant.isDefault,
          image: variant.image,
          combinationKey: variant.combinationKey,
          sortOrder: variant.sortOrder,
        },
      });
      if (variant.selections.length) {
        await prisma.productVariantSelection.createMany({
          data: variant.selections.map((selection) => ({
            variantId: createdVariant.id,
            attributeId: selection.attributeId,
            valueId: selection.valueId,
          })),
        });
      }
      if (!lockCatalogStock) {
        await writeCatalogStock(prisma, createdVariant.id, copiedStock, {
          note: "Ürün kopyalama",
        });
      }
    }

    revalidateProductAdmin(created.id, created.slug);
    return { success: true, redirectId: created.id };
  } catch (error) {
    console.error(error);
    return { error: "Ürün kopyalanırken bir hata oluştu." };
  }
}

export async function listProductVariantsAction(productId: string): Promise<{
  error?: string;
  variants?: ProductListVariantRow[];
}> {
  const gate = await requirePermission("products", "view");
  if (!gate.ok) return { error: gate.error };
  const id = String(productId ?? "").trim();
  if (!id) return { error: "Ürün bulunamadı." };
  const variants = await loadProductListVariants(id);
  if (!variants) return { error: "Ürün bulunamadı." };
  return { variants };
}

export async function updateProductVariantQuickAction(input: {
  variantId: string;
  barcode?: string;
  priceMinor?: number;
  stockQuantity?: number;
}): Promise<{ error?: string; variant?: ProductListVariantRow }> {
  const gate = await requirePermission("products", "update");
  if (!gate.ok) return { error: gate.error };

  const variantId = String(input.variantId ?? "").trim();
  if (!variantId) return { error: "Varyant bulunamadı." };

  const existing = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: {
      id: true,
      productId: true,
      isDefault: true,
      barcode: true,
      priceMinor: true,
      stockQuantity: true,
      product: { select: { slug: true } },
    },
  });
  if (!existing) return { error: "Varyant bulunamadı." };

  const data: { barcode?: string | null; priceMinor?: number } = {};

  if (input.barcode !== undefined) {
    const barcode = normalizeProductBarcode(input.barcode);
    const barcodeError = await variantDraftBarcodeError([{ id: existing.id, barcode }], {
      excludeVariantIds: [existing.id],
    });
    if (barcodeError) return { error: barcodeError };
    data.barcode = barcode;
  }

  if (input.priceMinor !== undefined) {
    if (!Number.isFinite(input.priceMinor) || input.priceMinor < 0) {
      return { error: "Geçerli bir fiyat girin." };
    }
    data.priceMinor = Math.round(input.priceMinor);
  }

  const lockCatalogStock = await isAdvancedInventoryEnabled();
  const wantsStock = input.stockQuantity !== undefined;
  if (wantsStock && lockCatalogStock) {
    return { error: "Stok yalnızca gelişmiş stok sisteminden değişir." };
  }
  let nextStock: number | null = null;
  if (wantsStock && !lockCatalogStock) {
    const qty = Number(input.stockQuantity);
    if (!Number.isFinite(qty) || qty < 0) return { error: "Geçerli bir stok girin." };
    nextStock = Math.round(qty);
  }

  try {
    if (Object.keys(data).length > 0) {
      await prisma.productVariant.update({
        where: { id: existing.id },
        data,
      });
    }
    if (data.priceMinor != null) {
      const siblingCount = await prisma.productVariant.count({
        where: { productId: existing.productId },
      });
      if (existing.isDefault || siblingCount <= 1) {
        await prisma.product.update({
          where: { id: existing.productId },
          data: { basePriceMinor: data.priceMinor },
        });
      }
    }
    if (nextStock != null) {
      await writeCatalogStock(prisma, existing.id, nextStock, {
        note: "Ürün listesi stok güncellemesi",
      });
    }
    invalidateDuplicateBarcodeCount();
    bustCatalogCache();
    revalidatePath("/", "layout");
    revalidatePath("/katalog");
    revalidatePath("/kategori");
    revalidatePath("/marka");
    revalidatePath("/arama");
    revalidatePath("/magaza");
    revalidatePath("/urunler");
    revalidatePath(`/admin/products/${existing.productId}/edit`);
    if (existing.product.slug) {
      revalidatePath(`/${existing.product.slug}`);
      revalidatePath(`/urun/${existing.product.slug}`);
      revalidatePath(`/urunler/${existing.product.slug}`);
    }
    const variants = await loadProductListVariants(existing.productId);
    const variant = variants?.find((row) => row.id === existing.id);
    if (!variant) return { error: "Varyant güncellendi ancak yeniden okunamadı." };
    return { variant };
  } catch (error) {
    console.error(error);
    return { error: "Varyant güncellenirken bir hata oluştu." };
  }
}

export type ProductSaleResult = {
  error?: string;
  variant?: ProductListVariantRow;
  product?: {
    id: string;
    basePriceMinor: number;
    compareAtMinor: number | null;
    saleStartsAt: string | null;
    saleEndsAt: string | null;
  };
};

export async function updateProductSaleAction(input: {
  variantId: string;
  remove?: boolean;
  listMinor?: number;
  chargeMinor?: number;
  saleStartsAt?: string | null;
  saleEndsAt?: string | null;
  applyToAll?: boolean;
}): Promise<ProductSaleResult> {
  const gate = await requirePermission("products", "update");
  if (!gate.ok) return { error: gate.error };

  const variantId = String(input.variantId ?? "").trim();
  if (!variantId) return { error: "Varyant bulunamadı." };

  const existing = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: {
      id: true,
      productId: true,
      priceMinor: true,
      compareAtMinor: true,
      saleStartsAt: true,
      saleEndsAt: true,
      product: { select: { slug: true } },
    },
  });
  if (!existing) return { error: "Varyant bulunamadı." };

  const saleStartsAt = input.saleStartsAt ?? null;
  const saleEndsAt = input.saleEndsAt ?? null;
  let windowStart: Date | null = null;
  let windowEnd: Date | null = null;
  let listRef = listPriceMinor(existing);
  let chargeRef = existing.priceMinor;

  if (!input.remove) {
    const listMinor =
      input.listMinor == null || !Number.isFinite(input.listMinor)
        ? null
        : Math.round(input.listMinor);
    const chargeMinor =
      input.chargeMinor == null || !Number.isFinite(input.chargeMinor)
        ? null
        : Math.round(input.chargeMinor);
    if (listMinor == null || listMinor <= 0) return { error: "Geçerli bir liste fiyatı girin." };
    if (chargeMinor == null || chargeMinor <= 0) {
      return { error: "Geçerli bir indirimli fiyat girin." };
    }
    if (chargeMinor >= listMinor) {
      return { error: "İndirimli fiyat, liste fiyatından küçük olmalı." };
    }
    const window = parseSaleWindow({
      timed: Boolean(saleStartsAt || saleEndsAt),
      startsAt: saleStartsAt ?? "",
      endsAt: saleEndsAt ?? "",
    });
    if (!window.ok) return { error: window.error };
    listRef = listMinor;
    chargeRef = chargeMinor;
    windowStart = window.saleStartsAt;
    windowEnd = window.saleEndsAt;
  }

  try {
    const siblings = input.applyToAll
      ? await prisma.productVariant.findMany({
          where: { productId: existing.productId },
          select: { id: true, priceMinor: true, compareAtMinor: true },
        })
      : [
          {
            id: existing.id,
            priceMinor: existing.priceMinor,
            compareAtMinor: existing.compareAtMinor,
          },
        ];

    await prisma.$transaction(
      siblings.map((row) => {
        const listMinor = row.id === existing.id && !input.remove ? listRef : listPriceMinor(row);
        const data = input.remove
          ? clearedSaleWrite(listMinor)
          : storedSaleWrite({
              listMinor,
              chargeMinor: row.id === existing.id ? chargeRef : ratioChargeMinor(listMinor, listRef, chargeRef),
              saleStartsAt: windowStart,
              saleEndsAt: windowEnd,
            });
        return prisma.productVariant.update({
          where: { id: row.id },
          data,
        });
      }),
    );

    await syncProductSaleFromDefault(existing.productId);
    revalidateProductAdmin(existing.productId, existing.product.slug ?? undefined);

    const [variants, product] = await Promise.all([
      loadProductListVariants(existing.productId),
      prisma.product.findUnique({
        where: { id: existing.productId },
        select: {
          id: true,
          basePriceMinor: true,
          compareAtMinor: true,
          saleStartsAt: true,
          saleEndsAt: true,
        },
      }),
    ]);
    const variant = variants?.find((row) => row.id === existing.id);
    if (!variant || !product) return { error: "Kampanya kaydedildi ancak yeniden okunamadı." };
    return {
      variant,
      product: {
        id: product.id,
        basePriceMinor: product.basePriceMinor,
        compareAtMinor: product.compareAtMinor,
        saleStartsAt: toIsoOrNull(product.saleStartsAt),
        saleEndsAt: toIsoOrNull(product.saleEndsAt),
      },
    };
  } catch (error) {
    console.error(error);
    return { error: "Kampanya kaydedilirken bir hata oluştu." };
  }
}
