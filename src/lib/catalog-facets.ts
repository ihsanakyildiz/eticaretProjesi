import "server-only";

import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";
import {
  resolveCatalogListingConstraint,
  type CatalogListingConstraintOmit,
} from "@/lib/catalog-listing-constraint";
import { catalogListingHref } from "@/lib/catalog-listing-params";
import type { CatalogListingFilters } from "@/lib/catalog-storefront";
import {
  getFiltersForCategory,
  listActiveFilterDefinitions,
  type ProductFilterDefinition,
} from "@/lib/product-filter-query";
import { prisma } from "@/lib/prisma";
import { parsePerformance } from "@/lib/performance";
import { getSettingsMap } from "@/lib/settings";
import { storefrontListingWhere } from "@/lib/storefront-product-where";

export type CatalogFacetValue = {
  id: string;
  name: string;
  slug: string;
  count: number;
};

export type CatalogFacetGroup = {
  id: string;
  name: string;
  slug: string;
  showProductCount: boolean;
  values: CatalogFacetValue[];
};

export type CatalogFacetBrand = {
  id: string;
  name: string;
  slug: string;
  count: number;
};

export type CatalogListingFacets = {
  brands: CatalogFacetBrand[];
  filterGroups: CatalogFacetGroup[];
};

const CACHE_REVALIDATE = 60;

function facetsCacheKey(filters: CatalogListingFilters, categoryId: string | null) {
  return JSON.stringify({
    cat: categoryId ?? "",
    c: [...(filters.categoryIds ?? [])].sort(),
    b: [...filters.brandSlugs].sort(),
    f: [...filters.filterValueIds].sort(),
    min: filters.minMajor,
    max: filters.maxMajor,
    q: filters.query ?? "",
  });
}

async function facetsCacheRevalidateSeconds() {
  try {
    const seconds = parsePerformance(await getSettingsMap()).htmlCacheSeconds;
    return seconds > 0 ? seconds : CACHE_REVALIDATE;
  } catch {
    return CACHE_REVALIDATE;
  }
}

async function assignmentCounts(
  filters: CatalogListingFilters,
  omit: CatalogListingConstraintOmit,
  filterId?: string,
) {
  const rows = await prisma.productFilterAssignment.groupBy({
    by: ["valueId"],
    where: {
      valueId: { not: null },
      ...(filterId ? { filterId } : {}),
      product: storefrontListingWhere(await resolveCatalogListingConstraint(filters, omit)),
    },
    _count: { _all: true },
  });

  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!row.valueId) continue;
    counts.set(row.valueId, row._count._all);
  }
  return counts;
}

async function resolveFilterDefinitions(
  categoryId: string | null,
): Promise<ProductFilterDefinition[]> {
  const filters = categoryId
    ? await getFiltersForCategory(categoryId)
    : await listActiveFilterDefinitions();
  return filters.filter((filter) => filter.kind === "CUSTOM");
}

async function loadBrandFacets(filters: CatalogListingFilters): Promise<CatalogFacetBrand[]> {
  const where = storefrontListingWhere(
    await resolveCatalogListingConstraint(filters, { brands: true }),
  );
  const grouped = await prisma.product.groupBy({
    by: ["brandId"],
    where: { ...where, brandId: { not: null } },
    _count: { _all: true },
  });
  const counts = new Map(
    grouped
      .filter((row): row is typeof row & { brandId: string } => Boolean(row.brandId))
      .map((row) => [row.brandId, row._count._all]),
  );
  if (counts.size === 0) return [];

  const brands = await prisma.brand.findMany({
    where: { isActive: true, id: { in: [...counts.keys()] } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true },
  });

  return brands
    .map((brand) => ({
      ...brand,
      count: counts.get(brand.id) ?? 0,
    }))
    .filter((brand) => brand.count > 0);
}

export async function getCatalogListingFacets(
  filters: CatalogListingFilters,
  categoryId: string | null = null,
): Promise<CatalogListingFacets> {
  const definitions = await resolveFilterDefinitions(categoryId);

  const [brands, groups] = await Promise.all([
    loadBrandFacets(filters),
    Promise.all(
      definitions.map(async (filter) => {
        const groupValueIds = new Set(filter.values.map((value) => value.id));
        const omitValueIds = filters.filterValueIds.filter((id) => groupValueIds.has(id));
        const counts = await assignmentCounts(filters, { omitValueIds }, filter.id);
        const values = filter.values
          .map((value) => ({
            id: value.id,
            name: value.name,
            slug: value.slug,
            count: counts.get(value.id) ?? 0,
          }))
          .filter((value) => value.count > 0);

        if (values.length === 0) return null;

        return {
          id: filter.id,
          name: filter.name,
          slug: filter.slug,
          showProductCount: filter.showProductCount,
          values,
        } satisfies CatalogFacetGroup;
      }),
    ),
  ]);

  return {
    brands,
    filterGroups: groups.filter((group): group is CatalogFacetGroup => Boolean(group)),
  };
}

export async function getCachedCatalogListingFacets(
  filters: CatalogListingFilters,
  categoryId: string | null = null,
): Promise<CatalogListingFacets> {
  const revalidate = await facetsCacheRevalidateSeconds();
  return unstable_cache(
    () => getCatalogListingFacets(filters, categoryId),
    ["catalog-listing-facets-v2", facetsCacheKey(filters, categoryId)],
    { tags: ["products", "site"], revalidate },
  )();
}

export function pruneUnavailableCatalogFilters(
  filters: CatalogListingFilters,
  facets: CatalogListingFacets,
  options: { preserveBrandSlugs?: boolean } = {},
): CatalogListingFilters | null {
  const visibleValueIds = new Set(
    facets.filterGroups.flatMap((group) => group.values.map((value) => value.id)),
  );
  const filterValueIds = filters.filterValueIds.filter((id) => visibleValueIds.has(id));

  const visibleBrandSlugs = new Set(facets.brands.map((brand) => brand.slug));
  const brandSlugs = options.preserveBrandSlugs
    ? filters.brandSlugs
    : filters.brandSlugs.filter((slug) => visibleBrandSlugs.has(slug));

  if (
    filterValueIds.length === filters.filterValueIds.length &&
    brandSlugs.length === filters.brandSlugs.length
  ) {
    return null;
  }

  return { ...filters, filterValueIds, brandSlugs };
}

export function redirectIfUnavailableFilters(
  basePath: string,
  filters: CatalogListingFilters,
  facets: CatalogListingFacets,
  options: { preserveBrandSlugs?: boolean } = {},
) {
  const pruned = pruneUnavailableCatalogFilters(filters, facets, options);
  if (!pruned) return;
  redirect(
    catalogListingHref(basePath, {
      sort: pruned.sort,
      brandSlugs: pruned.brandSlugs,
      minMajor: pruned.minMajor,
      maxMajor: pruned.maxMajor,
      filterValueIds: pruned.filterValueIds,
      query: pruned.query,
    }),
  );
}
