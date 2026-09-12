import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogBreadcrumb } from "@/components/site/catalog/catalog-breadcrumb";
import { CatalogFacetSidebar } from "@/components/site/catalog/catalog-facet-sidebar";
import { CatalogToolbar } from "@/components/site/catalog/catalog-toolbar";
import { CatalogPersonalizedResults } from "@/components/site/catalog/catalog-personalized-results";
import { JsonLd } from "@/components/site/json-ld";
import { SiteSidebarLayout } from "@/components/site/site-sidebar-layout";
import { SitePagination } from "@/components/site/site-pagination";
import { type CatalogSearchParams } from "@/components/site/catalog/catalog-listing-screen";
import { catalogListingHref, parseCatalogSearchQuery } from "@/lib/catalog-listing-params";
import { prepareRichHtml, stripHtml } from "@/lib/html";
import {
  CATALOG_GRID_PAGE_SIZE,
  catalogBrandHref,
  getCachedCatalogBrandPage,
  getCachedCatalogCategoryIndex,
  getCachedFilteredCatalogListing,
} from "@/lib/catalog-products";
import {
  getCachedCatalogListingFacets,
  redirectIfUnavailableFilters,
} from "@/lib/catalog-facets";
import { buildCollectionJsonLd } from "@/lib/json-ld";
import { parsePerformance, withCdnUrl } from "@/lib/performance";
import { buildPublicMetadata, resolveProductSeo } from "@/lib/seo";
import { getSettingsMap } from "@/lib/settings";
import {
  catalogHubTitle,
  parseUrlStructure,
  publicCatalogPath,
  type UrlStructure,
} from "@/lib/url-structure";


export async function catalogBrandMetadata(slug: string): Promise<Metadata> {
  const payload = await getCachedCatalogBrandPage(slug).catch(() => null);
  if (!payload) return { title: "Marka" };

  const settings = await getSettingsMap().catch(() => ({}) as Record<string, string>);
  const structure = parseUrlStructure(settings);
  const perf = parsePerformance(settings);
  const cover = withCdnUrl(payload.brand.banner || payload.brand.logo, perf.cdnUrl);
  const seo = resolveProductSeo({
    title: payload.brand.name,
    summary: payload.brand.tagline || payload.brand.description,
    seoTitle: payload.brand.seoTitle,
    seoDescription: payload.brand.seoDescription,
  });

  return buildPublicMetadata({
    settings,
    title: seo.seoTitle,
    description: seo.seoDescription,
    path: catalogBrandHref(payload.brand.slug, structure, payload.brand.urlId),
    image: cover,
  });
}

export async function CatalogBrandScreen({
  slug,
  search,
  urls,
}: {
  slug: string;
  search: CatalogSearchParams;
  urls: UrlStructure;
}) {
  const parsed = parseCatalogSearchQuery(search);
  const filters = {
    ...parsed.filters,
    brandSlugs: [slug],
  };

  const [payload, categories, settings] = await Promise.all([
    getCachedCatalogBrandPage(slug),
    getCachedCatalogCategoryIndex().catch(() => []),
    getSettingsMap().catch(() => ({}) as Record<string, string>),
  ]);
  if (!payload) notFound();

  const { brand } = payload;
  const [listing, facets] = await Promise.all([
    getCachedFilteredCatalogListing(filters, parsed.page),
    getCachedCatalogListingFacets(filters),
  ]);
  const path = catalogBrandHref(brand.slug, urls, brand.urlId);
  redirectIfUnavailableFilters(path, filters, facets, { preserveBrandSlugs: true });
  const perf = parsePerformance(settings);
  const totalPages = Math.max(1, Math.ceil(listing.total / CATALOG_GRID_PAGE_SIZE));
  const page = Math.min(parsed.page, totalPages);
  const description = prepareRichHtml(brand.description, {
    lazyImages: perf.lazyImages,
    lazyIframes: perf.lazyIframes,
    disableThirdParty: perf.disableThirdParty,
  });
  const catalogPath = publicCatalogPath(urls);
  const hubTitle = catalogHubTitle(urls);

  return (
    <>
      <JsonLd
        data={buildCollectionJsonLd({
          settings,
          title: brand.name,
          description: stripHtml(brand.tagline || brand.description) || brand.name,
          path,
          crumbs: [
            { name: settings.site_name?.trim() || "Ana Sayfa", path: "/" },
            { name: hubTitle, path: catalogPath },
            { name: brand.name, path },
          ],
        })}
      />
      <section className="py-5 sm:py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <CatalogBreadcrumb
            items={[
              { name: settings.site_name?.trim() || "Ana Sayfa", href: "/" },
              { name: hubTitle, href: catalogPath },
              { name: brand.name },
            ]}
          />
        </div>
        <SiteSidebarLayout
          compactSidebar
          sidebar={
            <CatalogFacetSidebar
              basePath={path}
              categories={categories}
              brands={[]}
              campaigns={facets.campaigns}
              filters={filters}
              filterGroups={facets.filterGroups}
            />
          }
        >
          <CatalogToolbar
            basePath={path}
            filters={filters}
            total={listing.total}
            heading={brand.name}
          />
          {listing.products.length === 0 ? (
            <p className="py-10 text-sm text-site-muted">Bu markada yayınlanmış ürün yok.</p>
          ) : (
            <CatalogPersonalizedResults
              products={listing.products}
              merchandisedIds={listing.merchandisedIds}
              pagination={
                <SitePagination
                  currentPage={page}
                  totalPages={totalPages}
                  hrefForPage={(next) =>
                    catalogListingHref(path, {
                      page: next,
                      sort: filters.sort,
                      filterValueIds: filters.filterValueIds,
                      campaignIds: filters.campaignIds,
                      minMajor: filters.minMajor,
                      maxMajor: filters.maxMajor,
                      query: filters.query,
                    })
                  }
                />
              }
            />
          )}
          {description ? (
            <div
              className="prose prose-slate mt-10 max-w-none text-sm dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: description }}
            />
          ) : null}
        </SiteSidebarLayout>
      </section>
    </>
  );
}
