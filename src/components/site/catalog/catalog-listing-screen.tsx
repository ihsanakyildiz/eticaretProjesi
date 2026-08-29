import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { CatalogFacetSidebar } from "@/components/site/catalog/catalog-facet-sidebar";
import { CatalogToolbar } from "@/components/site/catalog/catalog-toolbar";
import { ProductCard } from "@/components/site/catalog/product-card";
import { JsonLd } from "@/components/site/json-ld";
import { SiteLink } from "@/components/site/site-link";
import { SiteSidebarLayout } from "@/components/site/site-sidebar-layout";
import { SitePagination } from "@/components/site/site-pagination";
import { catalogListingHref, parseCatalogSearchQuery } from "@/lib/catalog-listing-params";
import {
  CATALOG_GRID_PAGE_SIZE,
  getCachedCatalogBrandsForFacets,
  getCachedCatalogCategoryIndex,
  getCachedCatalogFilterFacets,
  getFilteredCatalogListing,
} from "@/lib/catalog-products";
import { resolveUrlStructure } from "@/lib/catalog-routes";
import { buildCollectionJsonLd } from "@/lib/json-ld";
import { catalogPublicHubs, buildPublicMetadata } from "@/lib/seo";
import { getSettingsMap } from "@/lib/settings";
import {
  catalogHubTitle,
  publicCatalogPath,
  type UrlStructure,
} from "@/lib/url-structure";

const HomeCta = dynamic(() =>
  import("@/components/site/home/home-cta").then((mod) => mod.HomeCta),
);

export type CatalogSearchParams = {
  sayfa?: string;
  sira?: string;
  marka?: string;
  min?: string;
  max?: string;
  filtre?: string;
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

  const [listing, categories, brands, filterGroups, settings] = await Promise.all([
    getFilteredCatalogListing(filters, currentPage),
    getCachedCatalogCategoryIndex().catch(() => []),
    getCachedCatalogBrandsForFacets().catch(() => []),
    getCachedCatalogFilterFacets().catch(() => []),
    getSettingsMap().catch(() => ({}) as Record<string, string>),
  ]);

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
            { name: "Ana Sayfa", path: "/" },
            { name: hub.title, path: hub.path },
          ],
        })}
      />
      <section className="border-b border-site-border bg-site-surface py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav className="text-sm text-site-muted">
            <SiteLink href="/" className="hover:text-site-primary">
              Ana Sayfa
            </SiteLink>
            <span className="mx-2">/</span>
            <span className="text-site-fg">{hubTitle}</span>
          </nav>
          <h1 className="mt-2 font-display text-2xl font-bold text-site-fg sm:text-3xl">
            {filters.query ? `Arama: ${filters.query}` : hubTitle}
          </h1>
        </div>
      </section>

      <section className="py-8 sm:py-10">
        <SiteSidebarLayout
          sidebar={
            <CatalogFacetSidebar
              basePath={catalogPath}
              categories={categories}
              brands={brands}
              filters={filters}
              filterGroups={filterGroups}
            />
          }
        >
          <CatalogToolbar basePath={catalogPath} filters={filters} total={listing.total} />
          {listing.products.length === 0 ? (
            <p className="py-10 text-sm text-site-muted">Bu filtrelere uygun ürün yok.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {listing.products.map((product, index) => (
                  <ProductCard key={product.id} product={product} imagePriority={index < 4} />
                ))}
              </div>
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
                    query: filters.query,
                  })
                }
              />
            </>
          )}
        </SiteSidebarLayout>
      </section>
      <HomeCta />
    </>
  );
}
