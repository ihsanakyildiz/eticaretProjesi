import { CatalogBreadcrumb, type CatalogBreadcrumbItem } from "@/components/site/catalog/catalog-breadcrumb";
import { SiteLink } from "@/components/site/site-link";
import { catalogListingHref } from "@/lib/catalog-listing-params";
import { CATALOG_SORTS, type CatalogListingFilters } from "@/lib/catalog-storefront";

export function CatalogToolbar({
  basePath,
  filters,
  total,
  heading,
  crumbs = [],
}: {
  basePath: string;
  filters: CatalogListingFilters;
  total: number;
  heading: string;
  crumbs?: CatalogBreadcrumbItem[];
}) {
  const countLabel = `${total.toLocaleString("tr-TR")} Ürün`;

  return (
    <div className="mb-4 border-b border-site-border pb-3">
      <CatalogBreadcrumb items={crumbs} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="min-w-0 text-[15px] font-semibold leading-snug text-site-fg">
          {heading}{" "}
          <span className="font-normal text-site-muted">({countLabel})</span>
        </h1>
        <div className="flex flex-wrap gap-1.5 sm:justify-end">
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
                  campaignIds: filters.campaignIds,
                  query: filters.query,
                })}
                className={`rounded-md px-2.5 py-1.5 text-[11px] font-medium ${
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
    </div>
  );
}
