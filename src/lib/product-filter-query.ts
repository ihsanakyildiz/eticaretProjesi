import type { Prisma } from "@prisma/client";
import {
  collectDescendantIds,
  type CategoryNodeBase,
} from "@/lib/category-tree";
import { prisma } from "@/lib/prisma";
import {
  categoryIdsCoveredByFilter,
  filterAppliesToCategory,
  type StorefrontFilterSelection,
} from "@/lib/product-filters";

export type ProductFilterCatalogRow = CategoryNodeBase;

export type ProductFilterDefinition = {
  id: string;
  name: string;
  slug: string;
  kind: "CUSTOM" | "VARIANT" | "SYSTEM";
  systemKey: "BRAND" | "PRICE" | "AVAILABILITY" | null;
  variantAttributeId: string | null;
  inputType: "MULTI_SELECT" | "SWATCH" | "BOOLEAN" | "RANGE";
  unit: string | null;
  hideEmptyValues: boolean;
  showProductCount: boolean;
  appliesGlobally: boolean;
  inheritToChildren: boolean;
  sortOrder: number;
  assignedCategoryIds: string[];
  values: Array<{
    id: string;
    name: string;
    slug: string;
    colorHex: string | null;
    image: string | null;
    numberValue: number | null;
  }>;
};

function toNumber(value: { toNumber?: () => number } | number | null | undefined) {
  if (value == null) return null;
  if (typeof value === "number") return value;
  if (typeof value.toNumber === "function") return value.toNumber();
  return Number(value);
}

async function loadCategoryCatalog(): Promise<ProductFilterCatalogRow[]> {
  return prisma.productCategory.findMany({
    select: {
      id: true,
      parentId: true,
      name: true,
      slug: true,
      sortOrder: true,
      isActive: true,
    },
  });
}

export async function listActiveFilterDefinitions(): Promise<ProductFilterDefinition[]> {
  const rows = await prisma.productFilter.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      categories: { select: { categoryId: true } },
      values: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          slug: true,
          colorHex: true,
          image: true,
          numberValue: true,
        },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    kind: row.kind,
    systemKey: row.systemKey,
    variantAttributeId: row.variantAttributeId,
    inputType: row.inputType,
    unit: row.unit,
    hideEmptyValues: row.hideEmptyValues,
    showProductCount: row.showProductCount,
    appliesGlobally: row.appliesGlobally,
    inheritToChildren: row.inheritToChildren,
    sortOrder: row.sortOrder,
    assignedCategoryIds: row.categories.map((link) => link.categoryId),
    values: row.values.map((value) => ({
      id: value.id,
      name: value.name,
      slug: value.slug,
      colorHex: value.colorHex,
      image: value.image,
      numberValue: toNumber(value.numberValue),
    })),
  }));
}

/** Kategori vitrininde gösterilecek filtreler (miras dahil). categoryId yoksa yalnız global. */
export async function getFiltersForCategory(categoryId: string | null) {
  const [catalog, filters] = await Promise.all([
    loadCategoryCatalog(),
    listActiveFilterDefinitions(),
  ]);

  return filters.filter((filter) =>
    filterAppliesToCategory(
      catalog,
      {
        appliesGlobally: filter.appliesGlobally,
        inheritToChildren: filter.inheritToChildren,
        assignedCategoryIds: filter.assignedCategoryIds,
      },
      categoryId,
    ),
  );
}

export function listingCategoryIds(
  catalog: ProductFilterCatalogRow[],
  categoryId: string | null,
  includeDescendants = true,
): string[] | undefined {
  if (!categoryId) return undefined;
  if (!includeDescendants) return [categoryId];
  return [...collectDescendantIds(catalog, categoryId)];
}

function uniqueStrings(values: string[] | undefined) {
  return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))];
}

type ResolvedClause =
  | { type: "brand"; slugs: string[] }
  | { type: "price"; min?: number; max?: number }
  | { type: "availability"; inStock: boolean }
  | { type: "customValues"; filterId: string; valueIds: string[] }
  | { type: "customBoolean"; filterId: string; value: boolean }
  | { type: "customRange"; filterId: string; min?: number; max?: number }
  | { type: "variant"; attributeId: string; valueIds: string[] };

function resolveSelectionClauses(
  filters: ProductFilterDefinition[],
  selections: StorefrontFilterSelection[],
): ResolvedClause[] {
  const bySlug = new Map(filters.map((filter) => [filter.slug, filter]));
  const clauses: ResolvedClause[] = [];

  for (const selection of selections) {
    const filter = bySlug.get(selection.filterSlug);
    if (!filter) continue;

    switch (filter.kind) {
      case "SYSTEM": {
        if (filter.systemKey === "BRAND") {
          const slugs = uniqueStrings(selection.valueSlugs);
          if (slugs.length) clauses.push({ type: "brand", slugs });
          break;
        }
        if (filter.systemKey === "PRICE") {
          clauses.push({ type: "price", min: selection.min, max: selection.max });
          break;
        }
        if (filter.systemKey === "AVAILABILITY") {
          if (selection.booleanValue !== undefined) {
            clauses.push({ type: "availability", inStock: selection.booleanValue });
          }
          break;
        }
        break;
      }
      case "CUSTOM": {
        switch (filter.inputType) {
          case "MULTI_SELECT":
          case "SWATCH": {
            const slugs = uniqueStrings(selection.valueSlugs);
            const valueIds = filter.values
              .filter((value) => slugs.includes(value.slug))
              .map((value) => value.id);
            if (valueIds.length) {
              clauses.push({ type: "customValues", filterId: filter.id, valueIds });
            }
            break;
          }
          case "BOOLEAN": {
            if (selection.booleanValue !== undefined) {
              clauses.push({
                type: "customBoolean",
                filterId: filter.id,
                value: selection.booleanValue,
              });
            }
            break;
          }
          case "RANGE": {
            clauses.push({
              type: "customRange",
              filterId: filter.id,
              min: selection.min,
              max: selection.max,
            });
            break;
          }
          default: {
            const _exhaustive: never = filter.inputType;
            void _exhaustive;
            break;
          }
        }
        break;
      }
      case "VARIANT": {
        const slugs = uniqueStrings(selection.valueSlugs);
        if (!filter.variantAttributeId || !slugs.length) break;
        clauses.push({
          type: "variant",
          attributeId: filter.variantAttributeId,
          valueIds: slugs,
        });
        break;
      }
        default: {
          const _exhaustive: never = filter.kind;
          void _exhaustive;
        }
    }
  }

  return clauses;
}

async function resolveVariantValueIds(clauses: ResolvedClause[]): Promise<ResolvedClause[]> {
  const variantClauses = clauses.filter(
    (clause): clause is Extract<ResolvedClause, { type: "variant" }> => clause.type === "variant",
  );
  if (!variantClauses.length) return clauses;

  const attributeIds = [...new Set(variantClauses.map((clause) => clause.attributeId))];
  const values = await prisma.productAttributeValue.findMany({
    where: {
      attributeId: { in: attributeIds },
      isActive: true,
      slug: { in: [...new Set(variantClauses.flatMap((clause) => clause.valueIds))] },
    },
    select: { id: true, attributeId: true, slug: true },
  });

  return clauses.map((clause) => {
    if (clause.type !== "variant") return clause;
    const valueIds = values
      .filter(
        (value) =>
          value.attributeId === clause.attributeId && clause.valueIds.includes(value.slug),
      )
      .map((value) => value.id);
    return { ...clause, valueIds };
  });
}

function buildVariantWhere(clauses: ResolvedClause[]): Prisma.ProductVariantWhereInput | null {
  const variantAnd: Prisma.ProductVariantWhereInput[] = [{ isActive: true }];
  let used = false;

  for (const clause of clauses) {
    switch (clause.type) {
      case "variant": {
        if (!clause.valueIds.length) {
          variantAnd.push({ id: { in: [] } });
          used = true;
          break;
        }
        variantAnd.push({
          selections: {
            some: {
              attributeId: clause.attributeId,
              valueId: { in: clause.valueIds },
            },
          },
        });
        used = true;
        break;
      }
      case "price": {
        const price: Prisma.IntFilter = {};
        if (clause.min !== undefined && Number.isFinite(clause.min)) price.gte = Math.round(clause.min);
        if (clause.max !== undefined && Number.isFinite(clause.max)) price.lte = Math.round(clause.max);
        if (Object.keys(price).length) {
          variantAnd.push({ priceMinor: price });
          used = true;
        }
        break;
      }
      case "availability": {
        if (clause.inStock) {
          variantAnd.push({
            OR: [{ trackInventory: false }, { stockQuantity: { gt: 0 } }, { allowBackorder: true }],
          });
        } else {
          variantAnd.push({
            trackInventory: true,
            allowBackorder: false,
            stockQuantity: { lte: 0 },
          });
        }
        used = true;
        break;
      }
      case "brand":
      case "customValues":
      case "customBoolean":
      case "customRange":
        break;
      default: {
        const _exhaustive: never = clause;
        return _exhaustive;
      }
    }
  }

  if (!used) return null;
  return { AND: variantAnd };
}

function buildProductWhere(
  clauses: ResolvedClause[],
  categoryIds: string[] | undefined,
): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [{ isActive: true }];

  if (categoryIds) {
    and.push({ categoryId: { in: categoryIds } });
  }

  for (const clause of clauses) {
    switch (clause.type) {
      case "brand": {
        and.push({ brand: { slug: { in: clause.slugs } } });
        break;
      }
      case "customValues": {
        and.push({
          filterAssignments: {
            some: {
              filterId: clause.filterId,
              valueId: { in: clause.valueIds },
            },
          },
        });
        break;
      }
      case "customBoolean": {
        and.push({
          filterAssignments: {
            some: {
              filterId: clause.filterId,
              booleanValue: clause.value,
            },
          },
        });
        break;
      }
      case "customRange": {
        const numberValue: Prisma.DecimalNullableFilter<"ProductFilterAssignment"> = {};
        if (clause.min !== undefined && Number.isFinite(clause.min)) numberValue.gte = clause.min;
        if (clause.max !== undefined && Number.isFinite(clause.max)) numberValue.lte = clause.max;
        if (Object.keys(numberValue).length) {
          and.push({
            filterAssignments: {
              some: { filterId: clause.filterId, numberValue },
            },
          });
        }
        break;
      }
      case "variant":
      case "price":
      case "availability":
        break;
      default: {
        const _exhaustive: never = clause;
        return _exhaustive;
      }
    }
  }

  const variantWhere = buildVariantWhere(clauses);
  if (variantWhere) {
    and.push({ variants: { some: variantWhere } });
  }

  return { AND: and };
}

export type StorefrontProductFilterQuery = {
  categoryId?: string | null;
  includeDescendants?: boolean;
  selections: StorefrontFilterSelection[];
};

/**
 * Vitrin eşlemesi:
 * - Farklı filtre grupları VE
 * - Aynı grup içindeki değerler VEYA
 * - Varyant + fiyat + stok aynı SKU üzerinde kesişir (Shopify / Amazon)
 */
export async function findProductIdsMatchingFilters(
  query: StorefrontProductFilterQuery,
): Promise<string[]> {
  const [catalog, filters] = await Promise.all([
    loadCategoryCatalog(),
    listActiveFilterDefinitions(),
  ]);

  const categoryIds = listingCategoryIds(
    catalog,
    query.categoryId ?? null,
    query.includeDescendants ?? true,
  );

  const applicable = filters.filter((filter) =>
    filterAppliesToCategory(
      catalog,
      {
        appliesGlobally: filter.appliesGlobally,
        inheritToChildren: filter.inheritToChildren,
        assignedCategoryIds: filter.assignedCategoryIds,
      },
      query.categoryId ?? null,
    ),
  );

  const clauses = await resolveVariantValueIds(
    resolveSelectionClauses(applicable, query.selections),
  );

  const rows = await prisma.product.findMany({
    where: buildProductWhere(clauses, categoryIds),
    select: { id: true },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  });

  return rows.map((row) => row.id);
}

export function coveredCategoryIdsForFilter(
  catalog: ProductFilterCatalogRow[],
  filter: Pick<
    ProductFilterDefinition,
    "appliesGlobally" | "inheritToChildren" | "assignedCategoryIds"
  >,
) {
  return categoryIdsCoveredByFilter(catalog, {
    appliesGlobally: filter.appliesGlobally,
    inheritToChildren: filter.inheritToChildren,
    assignedCategoryIds: filter.assignedCategoryIds,
  });
}
