import { CatalogCategorySidebar, type CatalogSidebarCategory } from "@/components/site/catalog/catalog-category-sidebar";
import { SiteLink } from "@/components/site/site-link";
import { catalogListingHref } from "@/lib/catalog-listing-params";
import type { CatalogListingFilters } from "@/lib/catalog-storefront";

export function CatalogFacetSidebar({
  basePath,
  categories,
  activeCategorySlug,
  brands,
  filters,
  filterGroups,
}: {
  basePath: string;
  categories: CatalogSidebarCategory[];
  activeCategorySlug?: string | null;
  brands: { id: string; name: string; slug: string }[];
  filters: CatalogListingFilters;
  filterGroups: {
    id: string;
    name: string;
    values: { id: string; name: string; slug: string }[];
  }[];
}) {
  const toggleBrand = (slug: string) => {
    const has = filters.brandSlugs.includes(slug);
    return catalogListingHref(basePath, {
      sort: filters.sort,
      brandSlugs: has
        ? filters.brandSlugs.filter((item) => item !== slug)
        : [...filters.brandSlugs, slug],
      minMajor: filters.minMajor,
      maxMajor: filters.maxMajor,
      filterValueIds: filters.filterValueIds,
      query: filters.query,
    });
  };

  const toggleFilter = (valueId: string) => {
    const has = filters.filterValueIds.includes(valueId);
    return catalogListingHref(basePath, {
      sort: filters.sort,
      brandSlugs: filters.brandSlugs,
      minMajor: filters.minMajor,
      maxMajor: filters.maxMajor,
      filterValueIds: has
        ? filters.filterValueIds.filter((item) => item !== valueId)
        : [...filters.filterValueIds, valueId],
      query: filters.query,
    });
  };

  return (
    <div className="space-y-4">
      <CatalogCategorySidebar categories={categories} activeSlug={activeCategorySlug} />

      <aside className="rounded-lg border border-site-border bg-site-card p-4">
        <h2 className="text-sm font-semibold text-site-fg">Fiyat</h2>
        <form action={basePath} method="get" className="mt-2 space-y-2">
          {filters.sort !== "yeni" ? (
            <input type="hidden" name="sira" value={filters.sort} />
          ) : null}
          {filters.brandSlugs.length > 0 ? (
            <input type="hidden" name="marka" value={filters.brandSlugs.join(",")} />
          ) : null}
          {filters.filterValueIds.length > 0 ? (
            <input type="hidden" name="filtre" value={filters.filterValueIds.join(",")} />
          ) : null}
          {filters.query ? <input type="hidden" name="q" value={filters.query} /> : null}
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              name="min"
              min={0}
              step="1"
              defaultValue={filters.minMajor ?? ""}
              placeholder="Min"
              className="w-full rounded-md border border-site-border bg-site-card px-2 py-1.5 text-sm"
            />
            <input
              type="number"
              name="max"
              min={0}
              step="1"
              defaultValue={filters.maxMajor ?? ""}
              placeholder="Max"
              className="w-full rounded-md border border-site-border bg-site-card px-2 py-1.5 text-sm"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md border border-site-border px-2 py-1.5 text-xs font-medium text-site-fg hover:border-site-primary/40"
          >
            Uygula
          </button>
        </form>
      </aside>

      {brands.length > 0 ? (
        <aside className="rounded-lg border border-site-border bg-site-card p-4">
          <h2 className="text-sm font-semibold text-site-fg">Marka</h2>
          <ul className="mt-2 space-y-1">
            {brands.map((brand) => {
              const active = filters.brandSlugs.includes(brand.slug);
              return (
                <li key={brand.id}>
                  <SiteLink
                    href={toggleBrand(brand.slug)}
                    className={`block rounded-md px-2 py-1.5 text-sm ${
                      active
                        ? "bg-site-primary-soft font-medium text-site-primary"
                        : "text-site-fg hover:bg-site-surface"
                    }`}
                  >
                    {brand.name}
                  </SiteLink>
                </li>
              );
            })}
          </ul>
        </aside>
      ) : null}

      {filterGroups.map((group) =>
        group.values.length === 0 ? null : (
          <aside key={group.id} className="rounded-lg border border-site-border bg-site-card p-4">
            <h2 className="text-sm font-semibold text-site-fg">{group.name}</h2>
            <ul className="mt-2 space-y-1">
              {group.values.map((value) => {
                const active = filters.filterValueIds.includes(value.id);
                return (
                  <li key={value.id}>
                    <SiteLink
                      href={toggleFilter(value.id)}
                      className={`block rounded-md px-2 py-1.5 text-sm ${
                        active
                          ? "bg-site-primary-soft font-medium text-site-primary"
                          : "text-site-fg hover:bg-site-surface"
                      }`}
                    >
                      {value.name}
                    </SiteLink>
                  </li>
                );
              })}
            </ul>
          </aside>
        ),
      )}
    </div>
  );
}
