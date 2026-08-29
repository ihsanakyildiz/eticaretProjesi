import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { CatalogFacetSidebar } from "@/components/site/catalog/catalog-facet-sidebar";
import { CatalogToolbar } from "@/components/site/catalog/catalog-toolbar";
import { ProductCard } from "@/components/site/catalog/product-card";
import { JsonLd } from "@/components/site/json-ld";
import { SiteSidebarLayout } from "@/components/site/site-sidebar-layout";
import { SiteLink } from "@/components/site/site-link";
import { SitePagination } from "@/components/site/site-pagination";
import { type CatalogSearchParams } from "@/components/site/catalog/catalog-listing-screen";
import { catalogListingHref, parseCatalogSearchQuery } from "@/lib/catalog-listing-params";
import { prepareRichHtml, stripHtml } from "@/lib/html";
import {
  CATALOG_GRID_PAGE_SIZE,
  catalogBrandHref,
  getCachedCatalogBrandPage,
  getCachedCatalogCategoryIndex,
  getCachedCatalogFilterFacets,
  getFilteredCatalogListing,
} from "@/lib/catalog-products";
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

const HomeCta = dynamic(() =>
  import("@/components/site/home/home-cta").then((mod) => mod.HomeCta),
);

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

  const [payload, categories, filterGroups, settings] = await Promise.all([
    getCachedCatalogBrandPage(slug),
    getCachedCatalogCategoryIndex().catch(() => []),
    getCachedCatalogFilterFacets().catch(() => []),
    getSettingsMap().catch(() => ({}) as Record<string, string>),
  ]);
  if (!payload) notFound();

  const { brand } = payload;
  const listing = await getFilteredCatalogListing(filters, parsed.page);
  const perf = parsePerformance(settings);
  const totalPages = Math.max(1, Math.ceil(listing.total / CATALOG_GRID_PAGE_SIZE));
  const page = Math.min(parsed.page, totalPages);
  const description = prepareRichHtml(brand.description, {
    lazyImages: perf.lazyImages,
    lazyIframes: perf.lazyIframes,
    disableThirdParty: perf.disableThirdParty,
  });
  const path = catalogBrandHref(brand.slug, urls, brand.urlId);
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
            { name: "Ana Sayfa", path: "/" },
            { name: hubTitle, path: catalogPath },
            { name: brand.name, path },
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
            <SiteLink href={catalogPath} className="hover:text-site-primary">
              {hubTitle}
            </SiteLink>
            <span className="mx-2">/</span>
            <span className="text-site-fg">{brand.name}</span>
          </nav>
          <h1 className="mt-2 font-display text-2xl font-bold text-site-fg sm:text-3xl">
            {brand.name}
          </h1>
          {brand.tagline ? <p className="mt-1 text-sm text-site-muted">{brand.tagline}</p> : null}
        </div>
      </section>

      <section className="py-8 sm:py-10">
        <SiteSidebarLayout
          sidebar={
            <CatalogFacetSidebar
              basePath={path}
              categories={categories}
              brands={[]}
              filters={filters}
              filterGroups={filterGroups}
            />
          }
        >
          {description ? (
            <div
              className="prose prose-slate mb-6 max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: description }}
            />
          ) : null}
          <CatalogToolbar basePath={path} filters={filters} total={listing.total} />
          {listing.products.length === 0 ? (
            <p className="py-10 text-sm text-site-muted">Bu markada yayınlanmış ürün yok.</p>
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
                  catalogListingHref(path, {
                    page: next,
                    sort: filters.sort,
                    filterValueIds: filters.filterValueIds,
                    minMajor: filters.minMajor,
                    maxMajor: filters.maxMajor,
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
