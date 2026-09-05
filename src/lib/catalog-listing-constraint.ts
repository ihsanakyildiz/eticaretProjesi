import type { Prisma } from "@prisma/client";
import { loadCampaignProductIds } from "@/lib/campaigns";
import type { CatalogListingFilters } from "@/lib/catalog-storefront";
import { prisma } from "@/lib/prisma";

export type CatalogListingConstraintOmit = {
  brands?: boolean;
  campaigns?: boolean;
  customFilterValues?: boolean;
  omitValueIds?: ReadonlySet<string> | readonly string[];
  valueFilterIds?: ReadonlyMap<string, string>;
  campaignProductIds?: string[];
};

function omitValueSet(omit: CatalogListingConstraintOmit): Set<string> | null {
  if (omit.customFilterValues) return null;
  if (!omit.omitValueIds) return null;
  return omit.omitValueIds instanceof Set ? omit.omitValueIds : new Set(omit.omitValueIds);
}

export function catalogListingConstraint(
  filters: CatalogListingFilters,
  omit: CatalogListingConstraintOmit = {},
): Prisma.ProductWhereInput {
  const extra: Prisma.ProductWhereInput = {};
  const and: Prisma.ProductWhereInput[] = [];

  if (filters.categoryIds && filters.categoryIds.length > 0) {
    extra.categoryId = { in: filters.categoryIds };
  }

  if (!omit.brands && filters.brandSlugs.length > 0) {
    extra.brand = { slug: { in: filters.brandSlugs }, isActive: true };
  }

  if (!omit.customFilterValues) {
    const skip = omitValueSet(omit);
    const valueIds = skip
      ? filters.filterValueIds.filter((id) => !skip.has(id))
      : filters.filterValueIds;
    and.push(
      ...groupValueIdsByFilter(valueIds, omit.valueFilterIds).map((ids) => ({
        filterAssignments: { some: { valueId: { in: ids } } },
      })),
    );
  }

  if (filters.minMajor != null || filters.maxMajor != null) {
    const minMinor = filters.minMajor != null ? Math.round(filters.minMajor * 100) : undefined;
    const maxMinor = filters.maxMajor != null ? Math.round(filters.maxMajor * 100) : undefined;
    and.push({
      OR: [
        {
          variants: {
            some: {
              isActive: true,
              priceMinor: {
                ...(minMinor != null ? { gte: minMinor } : {}),
                ...(maxMinor != null ? { lte: maxMinor } : {}),
              },
            },
          },
        },
        {
          variants: { none: { isActive: true } },
          basePriceMinor: {
            ...(minMinor != null ? { gte: minMinor } : {}),
            ...(maxMinor != null ? { lte: maxMinor } : {}),
          },
        },
      ],
    });
  }

  const listingQuery = filters.query?.trim();
  if (!omit.campaigns && (filters.campaignIds ?? []).length > 0) {
    const productIds = omit.campaignProductIds ?? [];
    and.push({
      id: { in: productIds.length > 0 ? productIds : ["__none__"] },
    });
  }

  if (listingQuery) {
    and.push({
      OR: [
        { title: { contains: listingQuery } },
        { slug: { contains: listingQuery } },
        { brand: { is: { name: { contains: listingQuery } } } },
      ],
    });
  }

  if (and.length > 0) extra.AND = and;
  return extra;
}

function groupValueIdsByFilter(
  valueIds: string[],
  valueFilterIds?: ReadonlyMap<string, string>,
): string[][] {
  if (valueIds.length === 0) return [];
  const grouped = new Map<string, string[]>();
  for (const id of valueIds) {
    const key = valueFilterIds?.get(id) ?? `__solo_${id}`;
    const list = grouped.get(key) ?? [];
    list.push(id);
    grouped.set(key, list);
  }
  return [...grouped.values()];
}

async function loadValueFilterIds(valueIds: string[]): Promise<Map<string, string>> {
  const rows = await prisma.productFilterValue.findMany({
    where: { id: { in: valueIds } },
    select: { id: true, filterId: true },
  });
  return new Map(rows.map((row) => [row.id, row.filterId]));
}

export async function resolveCatalogListingConstraint(
  filters: CatalogListingFilters,
  omit: CatalogListingConstraintOmit = {},
): Promise<Prisma.ProductWhereInput> {
  const campaignProductIds =
    omit.campaigns || (filters.campaignIds ?? []).length === 0
      ? omit.campaignProductIds
      : await loadCampaignProductIds(filters.campaignIds);
  const withCampaigns = { ...omit, campaignProductIds };

  if (omit.customFilterValues || omit.valueFilterIds) {
    return catalogListingConstraint(filters, withCampaigns);
  }
  const skip = omitValueSet(omit);
  const pendingIds = skip
    ? filters.filterValueIds.filter((id) => !skip.has(id))
    : filters.filterValueIds;
  if (pendingIds.length === 0) {
    return catalogListingConstraint(filters, withCampaigns);
  }
  return catalogListingConstraint(filters, {
    ...withCampaigns,
    valueFilterIds: await loadValueFilterIds(pendingIds),
  });
}
