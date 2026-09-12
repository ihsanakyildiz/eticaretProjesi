import { cache } from "react";
import { loadProductPersonalizationFields } from "@/lib/product-personalization-db";
import { buildCategoryTree, toNamedTree } from "@/lib/category-tree";
import { DEFAULT_VARIANT_COMBINATION_KEY } from "@/lib/product-variants";
import { prisma } from "@/lib/prisma";
import type {
  ProductEditorFilter,
  ProductEditorInitial,
} from "./product-editor";
import type { GeneratorAttribute } from "./generate-combinations-modal";

function toNumber(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function loadProductEditorLookups(opts?: {
  brandId?: string | null;
  supplierId?: string | null;
  excludeProductId?: string | null;
}) {
  const [categories, brands, suppliers, attributes, customFilters, taxRates, relatedCandidates] =
    await Promise.all([
    prisma.productCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        parentId: true,
        name: true,
        slug: true,
        sortOrder: true,
        isActive: true,
      },
    }),
    prisma.brand.findMany({
      where: {
        OR: [{ isActive: true }, ...(opts?.brandId ? [{ id: opts.brandId }] : [])],
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.supplier.findMany({
      where: {
        OR: [{ isActive: true }, ...(opts?.supplierId ? [{ id: opts.supplierId }] : [])],
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.productAttribute.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        values: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: { id: true, name: true, colorHex: true },
        },
      },
    }),
    prisma.productFilter.findMany({
      where: { kind: "CUSTOM", isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        values: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: { id: true, name: true },
        },
        categories: { select: { categoryId: true } },
      },
    }),
    prisma.taxRate.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { percent: "asc" }],
      select: { id: true, name: true, percent: true, isDefault: true },
    }),
    prisma.product.findMany({
      where: opts?.excludeProductId ? { id: { not: opts.excludeProductId } } : undefined,
      orderBy: [{ title: "asc" }],
      select: { id: true, title: true, sku: true },
      take: 400,
    }),
  ]);

  const generatorAttributes: GeneratorAttribute[] = attributes
    .filter((attribute) => attribute.values.length > 0)
    .map((attribute) => ({
      id: attribute.id,
      name: attribute.name,
      values: attribute.values.map((value) => ({
        id: value.id,
        name: value.name,
        colorHex: value.colorHex,
      })),
    }));

  const filters: ProductEditorFilter[] = customFilters.map((filter) => ({
    id: filter.id,
    name: filter.name,
    inputType: filter.inputType,
    kind: filter.kind,
    appliesGlobally: filter.appliesGlobally,
    inheritToChildren: filter.inheritToChildren,
    assignedCategoryIds: filter.categories.map((row) => row.categoryId),
    unit: filter.unit,
    values: filter.values.map((value) => ({ id: value.id, name: value.name })),
  }));

  return {
    categoryTree: toNamedTree(buildCategoryTree(categories)),
    categoryCatalog: categories,
    brands,
    suppliers,
    attributes: generatorAttributes,
    customFilters: filters,
    taxRates,
    relatedCandidates,
  };
}

export const loadProductEditorInitial = cache(async function loadProductEditorInitial(
  id: string,
): Promise<ProductEditorInitial | null> {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      attachments: { orderBy: { sortOrder: "asc" } },
      filterAssignments: true,
      relatedFrom: { orderBy: { sortOrder: "asc" }, select: { relatedId: true } },
      variants: {
        orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }],
        include: { selections: true },
      },
    },
  });
  if (!product) return null;

  const variants = product.variants.length
    ? product.variants.map((variant) => ({
        id: variant.id,
        clientKey: variant.id,
        sku: variant.sku,
        barcode: variant.barcode ?? "",
        title: variant.title,
        priceMinor: variant.priceMinor,
        compareAtMinor: variant.compareAtMinor,
        stockQuantity: variant.stockQuantity,
        trackInventory: variant.trackInventory,
        allowBackorder: variant.allowBackorder,
        isDefault: variant.isDefault,
        isActive: variant.isActive,
        image: variant.image,
        combinationKey: variant.combinationKey || DEFAULT_VARIANT_COMBINATION_KEY,
        selections: variant.selections.map((selection) => ({
          attributeId: selection.attributeId,
          valueId: selection.valueId,
        })),
      }))
    : undefined;

  return {
    id: product.id,
    urlId: product.urlId,
    title: product.title,
    slug: product.slug,
    summary: product.summary ?? "",
    content: product.content ?? "",
    isActive: product.isActive,
    sortOrder: product.sortOrder,
    categoryId: product.categoryId,
    brandId: product.brandId,
    supplierId: product.supplierId,
    sku: product.sku,
    mpn: product.mpn,
    upc: product.upc,
    gtin: product.gtin,
    isbn: product.isbn,
    basePriceMinor: product.basePriceMinor,
    compareAtMinor: product.compareAtMinor,
    costMinor: product.costMinor,
    taxRatePercent: product.taxRatePercent,
    widthCm: toNumber(product.widthCm),
    heightCm: toNumber(product.heightCm),
    depthCm: toNumber(product.depthCm),
    weightKg: toNumber(product.weightKg),
    extraShippingMinor: product.extraShippingMinor,
    estimatedDelivery: product.estimatedDelivery,
    visibility: product.visibility,
    availableForOrder: product.availableForOrder,
    showPrice: product.showPrice,
    onlineOnly: product.onlineOnly,
    onSale: product.onSale,
    outOfStockBehavior: product.outOfStockBehavior,
    inStockLabel: product.inStockLabel,
    outOfStockLabel: product.outOfStockLabel,
    saleUnit: product.saleUnit,
    minOrderQty: product.minOrderQty,
    quantityStep: product.quantityStep,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    images: product.images.map((image) => ({
      id: image.id,
      url: image.url,
      alt: image.alt,
      isCover: image.isCover,
    })),
    attachments: product.attachments.map((row) => ({
      id: row.id,
      url: row.url,
      name: row.name,
    })),
    relatedIds: product.relatedFrom.map((row) => row.relatedId),
    features: product.filterAssignments.map((row) => ({
      filterId: row.filterId,
      valueId: row.valueId,
      numberValue: toNumber(row.numberValue),
      booleanValue: row.booleanValue,
    })),
    variants,
    personalizationFields: (await loadProductPersonalizationFields(product.id)).map((field) => ({
      clientKey: field.id,
      id: field.id,
      kind: field.kind,
      label: field.label,
      required: field.required,
      maxLength: field.maxLength,
    })),
  };
});
