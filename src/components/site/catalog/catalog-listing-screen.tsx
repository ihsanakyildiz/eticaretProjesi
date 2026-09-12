import type { Metadata } from "next";
import { CatalogBreadcrumb } from "@/components/site/catalog/catalog-breadcrumb";
import { CatalogFacetSidebar } from "@/components/site/catalog/catalog-facet-sidebar";
import { CatalogToolbar } from "@/components/site/catalog/catalog-toolbar";
import { CatalogPersonalizedResults } from "@/components/site/catalog/catalog-personalized-results";
import { JsonLd } from "@/components/site/json-ld";
import { SiteSidebarLayout } from "@/components/site/site-sidebar-layout";
import { SitePagination } from "@/components/site/site-pagination";
import { catalogListingHref, parseCatalogSearchQuery } from "@/lib/catalog-listing-params";
import {
  CATALOG_GRID_PAGE_SIZE,
  getCachedCatalogCategoryIndex,
  getCachedFilteredCatalogListing,
} from "@/lib/catalog-products";
import {
  getCachedCatalogListingFacets,
  redirectIfUnavailableFilters,
} from "@/lib/catalog-facets";
import { resolveUrlStructure } from "@/lib/catalog-routes";
import { buildCollectionJsonLd } from "@/lib/json-ld";
import { catalogPublicHubs, buildPublicMetadata } from "@/lib/seo";
import { getSettingsMap } from "@/lib/settings";
import {
  catalogHubTitle,
  publicCatalogPath,
  type UrlStructure,
} from "@/lib/url-structure";


export type CatalogSearchParams = {
  sayfa?: string;
  sira?: string;
  marka?: string;
  min?: string;
  max?: string;
  filtre?: string;
  kampanya?: string;
  q?: string;
};

export async function catalogListingMetadata(): Promise<Metadata> {
  const [settings, urls] = await Promise.all([
    getSettingsMap().catch(() => ({}) as Record<string, string>),
    resolveUrlStructure(),
  ]);
  return buildPublicMetadata({
    settings,
    ...catalogPublicHubs(urls).products,
  });
}

export async function CatalogListingScreen({
  search,
  urls,
}: {
  search: CatalogSearchParams;
  urls: UrlStructure;
}) {
  const { page: currentPage, filters } = parseCatalogSearchQuery(search);
  const hub = catalogPublicHubs(urls).products;
  const catalogPath = publicCatalogPath(urls);
  const hubTitle = catalogHubTitle(urls);

  const [listing, categories, facets, settings] = await Promise.all([
    getCachedFilteredCatalogListing(filters, currentPage),
    getCachedCatalogCategoryIndex().catch(() => []),
    getCachedCatalogListingFacets(filters),
    getSettingsMap().catch(() => ({}) as Record<string, string>),
  ]);
  redirectIfUnavailableFilters(catalogPath, filters, facets);

  const totalPages = Math.max(1, Math.ceil(listing.total / CATALOG_GRID_PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);

  return (
    <>
      <JsonLd
        data={buildCollectionJsonLd({
          settings,
          title: hub.title,
          description: hub.description,
          path: hub.path,
          crumbs: [
            { name: settings.site_name?.trim() || "Ana Sayfa", path: "/" },
            { name: hub.title, path: hub.path },
          ],
        })}
      />
      <section className="py-5 sm:py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <CatalogBreadcrumb
            items={[
              { name: settings.site_name?.trim() || "Ana Sayfa", href: "/" },
              {
                name: filters.query ? `Arama: ${filters.query}` : hubTitle,
              },
            ]}
          />
        </div>
        <SiteSidebarLayout
          compactSidebar
          sidebar={
            <CatalogFacetSidebar
              basePath={catalogPath}
              categories={categories}
              brands={facets.brands}
              campaigns={facets.campaigns}
              filters={filters}
              filterGroups={facets.filterGroups}
            />
          }
        >
          <CatalogToolbar
            basePath={catalogPath}
            filters={filters}
            total={listing.total}
            heading={filters.query ? `Arama: ${filters.query}` : hubTitle}
          />
          {listing.products.length === 0 ? (
            <p className="py-10 text-sm text-site-muted">Bu filtrelere uygun ürün yok.</p>
          ) : (
            <CatalogPersonalizedResults
              products={listing.products}
              merchandisedIds={listing.merchandisedIds}
              pagination={
                <SitePagination
                  currentPage={page}
                  totalPages={totalPages}
                  hrefForPage={(next) =>
                    catalogListingHref(catalogPath, {
                      page: next,
                      sort: filters.sort,
                      brandSlugs: filters.brandSlugs,
                      minMajor: filters.minMajor,
                      maxMajor: filters.maxMajor,
                      filterValueIds: filters.filterValueIds,
                      campaignIds: filters.campaignIds,
                      query: filters.query,
                    })
                  }
                />
              }
            />
          )}
        </SiteSidebarLayout>
      </section>
    </>
  );
}
