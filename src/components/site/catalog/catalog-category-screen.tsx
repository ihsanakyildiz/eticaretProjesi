import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogBreadcrumb } from "@/components/site/catalog/catalog-breadcrumb";
import { CatalogFacetSidebar } from "@/components/site/catalog/catalog-facet-sidebar";
import { CatalogToolbar } from "@/components/site/catalog/catalog-toolbar";
import { ProductCard } from "@/components/site/catalog/product-card";
import { JsonLd } from "@/components/site/json-ld";
import { SiteSidebarLayout } from "@/components/site/site-sidebar-layout";
import { SitePagination } from "@/components/site/site-pagination";
import { collectDescendantIds, getCategoryBreadcrumb } from "@/lib/category-tree";
import { catalogListingHref, parseCatalogSearchQuery } from "@/lib/catalog-listing-params";
import { prepareRichHtml, stripHtml } from "@/lib/html";
import {
  CATALOG_GRID_PAGE_SIZE,
  catalogCategoryHref,
  getCachedCatalogCategoryIndex,
  getCachedCatalogCategoryPage,
  getCachedFilteredCatalogListing,
} from "@/lib/catalog-products";
import {
  getCachedCatalogListingFacets,
  redirectIfUnavailableFilters,
} from "@/lib/catalog-facets";
import { type CatalogSearchParams } from "@/components/site/catalog/catalog-listing-screen";
import { buildCollectionJsonLd } from "@/lib/json-ld";
import { parsePerformance, withCdnUrl } from "@/lib/performance";
import { buildPublicMetadata, resolveProductSeo } from "@/lib/seo";
import { getSettingsMap } from "@/lib/settings";
import {
  parseUrlStructure,
  type UrlStructure,
} from "@/lib/url-structure";


export async function catalogCategoryMetadata(slug: string): Promise<Metadata> {
  const payload = await getCachedCatalogCategoryPage(slug).catch(() => null);
  if (!payload) return { title: "Kategori" };

  const settings = await getSettingsMap().catch(() => ({}) as Record<string, string>);
  const structure = parseUrlStructure(settings);
  const perf = parsePerformance(settings);
  const cover = withCdnUrl(payload.category.image, perf.cdnUrl);
  const seo = resolveProductSeo({
    title: payload.category.name,
    summary: payload.category.description,
    seoTitle: payload.category.seoTitle,
    seoDescription: payload.category.seoDescription,
  });

  return buildPublicMetadata({
    settings,
    title: seo.seoTitle,
    description: seo.seoDescription,
    path: catalogCategoryHref(payload.category.slug, structure, payload.category.urlId),
    image: cover,
  });
}

export async function CatalogCategoryScreen({
  slug,
  search,
  urls,
}: {
  slug: string;
  search: CatalogSearchParams;
  urls: UrlStructure;
}) {
  const { page: currentPage, filters } = parseCatalogSearchQuery(search);

  const [payload, categories, settings] = await Promise.all([
    getCachedCatalogCategoryPage(slug),
    getCachedCatalogCategoryIndex().catch(() => []),
    getSettingsMap().catch(() => ({}) as Record<string, string>),
  ]);
  if (!payload) notFound();

  const { category } = payload;
  const categoryIds = [...collectDescendantIds(categories, category.id)];
  const listingFilters = { ...filters, categoryIds };
  const [listing, facets] = await Promise.all([
    getCachedFilteredCatalogListing(listingFilters, currentPage),
    getCachedCatalogListingFacets(listingFilters, category.id),
  ]);
  const path = catalogCategoryHref(category.slug, urls, category.urlId);
  redirectIfUnavailableFilters(path, filters, facets);
  const perf = parsePerformance(settings);
  const totalPages = Math.max(1, Math.ceil(listing.total / CATALOG_GRID_PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const description = prepareRichHtml(category.description, {
    lazyImages: perf.lazyImages,
    lazyIframes: perf.lazyIframes,
    disableThirdParty: perf.disableThirdParty,
  });
  const homeLabel = settings.site_name?.trim() || "Ana Sayfa";
  const categoryTrail = getCategoryBreadcrumb(categories, category.id);
  const crumbs = [
    { name: homeLabel, href: "/" },
    ...categoryTrail.map((item, index) => ({
      name: item.name,
      href:
        index === categoryTrail.length - 1
          ? undefined
          : catalogCategoryHref(item.slug, urls, item.urlId),
    })),
  ];

  return (
    <>
      <JsonLd
        data={buildCollectionJsonLd({
          settings,
          title: category.name,
          description: stripHtml(category.description) || category.name,
          path,
          crumbs: [
            { name: homeLabel, path: "/" },
            ...categoryTrail.map((item) => ({
              name: item.name,
              path: catalogCategoryHref(item.slug, urls, item.urlId),
            })),
          ],
        })}
      />
      <section className="py-5 sm:py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <CatalogBreadcrumb items={crumbs} />
        </div>
        <SiteSidebarLayout
          compactSidebar
          sidebar={
            <CatalogFacetSidebar
              basePath={path}
              categories={categories}
              activeCategorySlug={category.slug}
              brands={facets.brands}
              campaigns={facets.campaigns}
              filters={filters}
              filterGroups={facets.filterGroups}
            />
          }
        >
          <CatalogToolbar
            basePath={path}
            filters={{ ...filters, categoryIds }}
            total={listing.total}
            heading={category.name}
          />
          {listing.products.length === 0 ? (
            <p className="py-10 text-sm text-site-muted">
              {filters.filterValueIds.length > 0 ||
              filters.brandSlugs.length > 0 ||
              (filters.campaignIds ?? []).length > 0 ||
              filters.minMajor != null ||
              filters.maxMajor != null
                ? "Bu filtrelere uygun ürün yok."
                : "Bu kategoride yayınlanmış ürün yok."}
            </p>
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
                    brandSlugs: filters.brandSlugs,
                    minMajor: filters.minMajor,
                    maxMajor: filters.maxMajor,
                    filterValueIds: filters.filterValueIds,
                    campaignIds: filters.campaignIds,
                    query: filters.query,
                  })
                }
              />
            </>
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
