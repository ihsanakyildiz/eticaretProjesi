import { SiteLink } from "@/components/site/site-link";
import { catalogListingHref } from "@/lib/catalog-listing-params";
import { CATALOG_SORTS, type CatalogListingFilters } from "@/lib/catalog-storefront";

export function CatalogToolbar({
  basePath,
  filters,
  total,
}: {
  basePath: string;
  filters: CatalogListingFilters;
  total: number;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 border-b border-site-border pb-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-site-muted">
        {total} ürün
        {filters.query ? (
          <>
            {" "}
            · “{filters.query}”
          </>
        ) : null}
      </p>
      <div className="flex flex-wrap gap-2">
        {CATALOG_SORTS.map((item) => {
          const active = filters.sort === item.value;
          return (
            <SiteLink
              key={item.value}
              href={catalogListingHref(basePath, {
                sort: item.value,
                brandSlugs: filters.brandSlugs,
                minMajor: filters.minMajor,
                maxMajor: filters.maxMajor,
                filterValueIds: filters.filterValueIds,
                query: filters.query,
              })}
              className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${
                active
                  ? "bg-site-primary text-white"
                  : "border border-site-border text-site-fg hover:border-site-primary/40"
              }`}
            >
              {item.label}
            </SiteLink>
          );
        })}
      </div>
    </div>
  );
}
