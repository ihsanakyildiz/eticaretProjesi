import type { CatalogFacetBrand, CatalogFacetGroup } from "@/lib/catalog-facets";
import { catalogFiltersHref } from "@/lib/catalog-listing-params";
import type { CatalogListingFilters } from "@/lib/catalog-storefront";
import { formatMinorTl } from "@/lib/product-money";

export type CatalogActiveFilterChip = {
  key: string;
  label: string;
  href: string;
};

export function catalogActiveFilterChips({
  basePath,
  filters,
  brands,
  filterGroups,
  activeCategory,
}: {
  basePath: string;
  filters: CatalogListingFilters;
  brands: CatalogFacetBrand[];
  filterGroups: CatalogFacetGroup[];
  activeCategory: { id: string; name: string; href: string } | null;
}): CatalogActiveFilterChip[] {
  const chips: CatalogActiveFilterChip[] = [];
  const hrefFor = (patch: Parameters<typeof catalogFiltersHref>[2]) =>
    catalogFiltersHref(basePath, filters, patch);

  if (activeCategory) {
    chips.push({
      key: `category-${activeCategory.id}`,
      label: activeCategory.name,
      href: activeCategory.href,
    });
  }

  if (filters.query) {
    chips.push({
      key: "query",
      label: `“${filters.query}”`,
      href: hrefFor({ query: null }),
    });
  }

  if (filters.minMajor != null || filters.maxMajor != null) {
    chips.push({
      key: "price",
      label: priceChipLabel(filters.minMajor, filters.maxMajor),
      href: hrefFor({ minMajor: null, maxMajor: null }),
    });
  }

  for (const slug of filters.brandSlugs) {
    const brand = brands.find((item) => item.slug === slug);
    if (!brand) continue;
    chips.push({
      key: `brand-${brand.id}`,
      label: brand.name,
      href: hrefFor({
        brandSlugs: filters.brandSlugs.filter((item) => item !== slug),
      }),
    });
  }

  const values = filterGroups.flatMap((group) => group.values);
  for (const valueId of filters.filterValueIds) {
    const value = values.find((item) => item.id === valueId);
    if (!value) continue;
    chips.push({
      key: `filter-${value.id}`,
      label: value.name,
      href: hrefFor({
        filterValueIds: filters.filterValueIds.filter((id) => id !== valueId),
      }),
    });
  }

  return chips;
}

function priceChipLabel(minMajor: number | null, maxMajor: number | null) {
  const minLabel = minMajor != null ? formatMinorTl(Math.round(minMajor * 100)) : null;
  const maxLabel = maxMajor != null ? formatMinorTl(Math.round(maxMajor * 100)) : null;
  if (minLabel && maxLabel) return `${minLabel} – ${maxLabel}`;
  if (minLabel) return `${minLabel} ve üzeri`;
  return `${maxLabel} ve altı`;
}
