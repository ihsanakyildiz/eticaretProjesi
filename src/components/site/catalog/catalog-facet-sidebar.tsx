"use client";

import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";
import { CatalogActiveFilterChips } from "@/components/site/catalog/catalog-active-filters";
import {
  CatalogFilterSearchList,
  type CatalogFilterOption,
} from "@/components/site/catalog/catalog-filter-search-list";
import type { CatalogSidebarCategory } from "@/components/site/catalog/catalog-category-sidebar";
import { useCatalogUrls } from "@/components/site/site-url-provider";
import { catalogActiveFilterChips } from "@/lib/catalog-active-filters";
import type { CatalogCampaignFacet } from "@/lib/campaign-kinds";
import type { CatalogFacetBrand, CatalogFacetGroup } from "@/lib/catalog-facets";
import { catalogFiltersHref } from "@/lib/catalog-listing-params";
import { CATALOG_DEFAULT_SORT, type CatalogListingFilters } from "@/lib/catalog-storefront";

export function CatalogFacetSidebar({
  basePath,
  categories,
  activeCategorySlug,
  brands,
  campaigns = [],
  filters,
  filterGroups,
}: {
  basePath: string;
  categories: CatalogSidebarCategory[];
  activeCategorySlug?: string | null;
  brands: CatalogFacetBrand[];
  campaigns?: CatalogCampaignFacet[];
  filters: CatalogListingFilters;
  filterGroups: CatalogFacetGroup[];
}) {
  const { catalogPath, categoryHref } = useCatalogUrls();
  const activeCategory = categories.find((item) => item.slug === activeCategorySlug) ?? null;
  const parentCategory = activeCategory?.parentId
    ? (categories.find((item) => item.id === activeCategory.parentId) ?? null)
    : null;

  const hrefFor = (patch: Parameters<typeof catalogFiltersHref>[2] = {}) =>
    catalogFiltersHref(basePath, filters, patch);

  const categoryListingHref = (category: CatalogSidebarCategory) =>
    catalogFiltersHref(categoryHref(category.slug, category.urlId), filters);

  const categoryParentHref = parentCategory
    ? categoryListingHref(parentCategory)
    : catalogFiltersHref(catalogPath, filters);

  const toggleBrand = (slug: string) => {
    const has = filters.brandSlugs.includes(slug);
    return hrefFor({
      brandSlugs: has
        ? filters.brandSlugs.filter((item) => item !== slug)
        : [...filters.brandSlugs, slug],
    });
  };

  const toggleCampaign = (campaignId: string) => {
    const selected = filters.campaignIds ?? [];
    const has = selected.includes(campaignId);
    return hrefFor({
      campaignIds: has ? selected.filter((id) => id !== campaignId) : [...selected, campaignId],
    });
  };

  const toggleFilter = (valueId: string) => {
    const has = filters.filterValueIds.includes(valueId);
    return hrefFor({
      filterValueIds: has
        ? filters.filterValueIds.filter((item) => item !== valueId)
        : [...filters.filterValueIds, valueId],
    });
  };

  const categoryOptions: CatalogFilterOption[] = visibleCategoryLevel(
    categories,
    activeCategorySlug,
  ).map((item) => {
    const active = activeCategorySlug === item.slug;
    return {
      id: item.id,
      name: item.name,
      href: active ? categoryParentHref : categoryListingHref(item),
      active,
    };
  });

  const allCategoryOptions: CatalogFilterOption[] = categories.map((item) => {
    const active = activeCategorySlug === item.slug;
    return {
      id: item.id,
      name: item.name,
      href: active ? categoryParentHref : categoryListingHref(item),
      active,
    };
  });

  const brandOptions: CatalogFilterOption[] = brands.map((brand) => ({
    id: brand.id,
    name: brand.name,
    href: toggleBrand(brand.slug),
    active: filters.brandSlugs.includes(brand.slug),
  }));

  const chips = catalogActiveFilterChips({
    basePath,
    filters,
    brands,
    campaigns,
    filterGroups,
    activeCategory: activeCategory
      ? {
          id: activeCategory.id,
          name: activeCategory.name,
          href: categoryParentHref,
        }
      : null,
  });

  const hasQueryFilters =
    filters.brandSlugs.length > 0 ||
    filters.filterValueIds.length > 0 ||
    (filters.campaignIds ?? []).length > 0 ||
    filters.minMajor != null ||
    filters.maxMajor != null ||
    Boolean(filters.query);
  const clearAllHref = hasQueryFilters
    ? hrefFor({
        brandSlugs: [],
        filterValueIds: [],
        campaignIds: [],
        minMajor: null,
        maxMajor: null,
        query: null,
      })
    : catalogPath;

  return (
    <div className="min-w-0 text-[12px] font-normal lg:sticky lg:top-28 lg:flex lg:max-h-[calc(100dvh-8rem)] lg:flex-col lg:self-start">
      <CatalogActiveFilterChips chips={chips} clearHref={clearAllHref} />

      <div className="min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain">
        {categoryOptions.length > 0 ? (
          <FilterAccordion title="Kategori" pinned>
            <CatalogFilterSearchList
              placeholder="Kategori Ara"
              options={categoryOptions}
              searchPool={allCategoryOptions}
            />
          </FilterAccordion>
        ) : null}

        {brands.length > 0 ? (
          <FilterAccordion title="Marka" pinned>
            <CatalogFilterSearchList placeholder="Marka Ara" options={brandOptions} searchable />
          </FilterAccordion>
        ) : null}

        {campaigns.length > 0 ? (
          <FilterAccordion title="Kampanyalar" pinned>
            <CatalogFilterSearchList
              placeholder="Kampanya Ara"
              options={campaigns.map((campaign) => ({
                id: campaign.id,
                name: `${campaign.name} · ${campaign.label}`,
                href: toggleCampaign(campaign.id),
                active: (filters.campaignIds ?? []).includes(campaign.id),
              }))}
              searchable={campaigns.length > 6}
            />
          </FilterAccordion>
        ) : null}

        <FilterAccordion title="Fiyat" pinned>
          <form action={basePath} method="get" className="space-y-1.5">
            {filters.sort !== CATALOG_DEFAULT_SORT ? (
              <input type="hidden" name="sira" value={filters.sort} />
            ) : null}
            {filters.brandSlugs.length > 0 ? (
              <input type="hidden" name="marka" value={filters.brandSlugs.join(",")} />
            ) : null}
            {filters.filterValueIds.length > 0 ? (
              <input type="hidden" name="filtre" value={filters.filterValueIds.join(",")} />
            ) : null}
            {(filters.campaignIds ?? []).length > 0 ? (
              <input type="hidden" name="kampanya" value={filters.campaignIds.join(",")} />
            ) : null}
            {filters.query ? <input type="hidden" name="q" value={filters.query} /> : null}
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="number"
                name="min"
                min={0}
                step="1"
                defaultValue={filters.minMajor ?? ""}
                placeholder="En az"
                className="w-full rounded border border-site-border bg-site-surface px-2 py-1.5 text-[12px] outline-none placeholder:text-site-muted/70 focus:border-site-primary/40"
              />
              <input
                type="number"
                name="max"
                min={0}
                step="1"
                defaultValue={filters.maxMajor ?? ""}
                placeholder="En çok"
                className="w-full rounded border border-site-border bg-site-surface px-2 py-1.5 text-[12px] outline-none placeholder:text-site-muted/70 focus:border-site-primary/40"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded bg-site-primary px-2 py-1.5 text-[11px] font-medium text-white hover:opacity-90"
            >
              Uygula
            </button>
          </form>
        </FilterAccordion>

        {filterGroups.map((group, index) => {
          if (group.values.length === 0) return null;
          const pinExtra =
            (categoryOptions.length > 0 ? 1 : 0) + (brands.length > 0 ? 1 : 0) + 1 < 3 &&
            index === filterGroups.findIndex((item) => item.values.length > 0);
          const hasActive = group.values.some((value) => filters.filterValueIds.includes(value.id));
          return (
            <FilterAccordion
              key={group.id}
              title={group.name}
              pinned={pinExtra}
              defaultOpen={hasActive}
            >
              <CatalogFilterSearchList
                placeholder={`${group.name} Ara`}
                options={group.values.map((value) => ({
                  id: value.id,
                  name: value.name,
                  href: toggleFilter(value.id),
                  active: filters.filterValueIds.includes(value.id),
                }))}
                searchable={group.values.length > 6}
              />
            </FilterAccordion>
          );
        })}
      </div>
    </div>
  );
}

function FilterAccordion({
  title,
  children,
  pinned = false,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  pinned?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (pinned) {
    return (
      <section className="border-b border-site-border">
        <div className="flex items-center justify-between py-2.5 text-[13px] font-medium text-site-fg">
          <span>{title}</span>
        </div>
        <div className="pb-2.5">{children}</div>
      </section>
    );
  }

  return (
    <details
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="group border-b border-site-border"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between py-2.5 text-[13px] font-medium text-site-fg select-none [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <ChevronDown className="h-3.5 w-3.5 text-site-muted transition group-open:rotate-180" />
      </summary>
      <div className="pb-2.5">{children}</div>
    </details>
  );
}

function visibleCategoryLevel(
  categories: CatalogSidebarCategory[],
  activeSlug?: string | null,
) {
  const byId = new Map(categories.map((item) => [item.id, item]));
  const roots = categories.filter((item) => !item.parentId || !byId.has(item.parentId));
  const childrenOf = (id: string) => categories.filter((item) => item.parentId === id);

  if (!activeSlug) return roots;

  const active = categories.find((item) => item.slug === activeSlug);
  if (!active) return roots;

  const children = childrenOf(active.id);
  if (children.length > 0) return [active, ...children];
  if (active.parentId && byId.has(active.parentId)) return childrenOf(active.parentId);
  return [active];
}
