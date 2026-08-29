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
import { collectDescendantIds } from "@/lib/category-tree";
import { catalogListingHref, parseCatalogSearchQuery } from "@/lib/catalog-listing-params";
import { prepareRichHtml, stripHtml } from "@/lib/html";
import {
  CATALOG_GRID_PAGE_SIZE,
  catalogCategoryHref,
  getCachedCatalogBrandsForFacets,
  getCachedCatalogCategoryIndex,
  getCachedCatalogCategoryPage,
  getCachedCatalogFilterFacets,
  getFilteredCatalogListing,
} from "@/lib/catalog-products";
import { type CatalogSearchParams } from "@/components/site/catalog/catalog-listing-screen";
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

  const [payload, categories, brands, filterGroups, settings] = await Promise.all([
    getCachedCatalogCategoryPage(slug),
    getCachedCatalogCategoryIndex().catch(() => []),
    getCachedCatalogBrandsForFacets().catch(() => []),
    getCachedCatalogFilterFacets().catch(() => []),
    getSettingsMap().catch(() => ({}) as Record<string, string>),
  ]);
  if (!payload) notFound();

  const { category } = payload;
  const categoryIds = [...collectDescendantIds(categories, category.id)];
  const listing = await getFilteredCatalogListing({ ...filters, categoryIds }, currentPage);
  const perf = parsePerformance(settings);
  const totalPages = Math.max(1, Math.ceil(listing.total / CATALOG_GRID_PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const description = prepareRichHtml(category.description, {
    lazyImages: perf.lazyImages,
    lazyIframes: perf.lazyIframes,
    disableThirdParty: perf.disableThirdParty,
  });
  const path = catalogCategoryHref(category.slug, urls, category.urlId);
  const catalogPath = publicCatalogPath(urls);
  const hubTitle = catalogHubTitle(urls);

  return (
    <>
      <JsonLd
        data={buildCollectionJsonLd({
          settings,
          title: category.name,
          description: stripHtml(category.description) || category.name,
          path,
          crumbs: [
            { name: "Ana Sayfa", path: "/" },
            { name: hubTitle, path: catalogPath },
            { name: category.name, path },
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
            <span className="text-site-fg">{category.name}</span>
          </nav>
          <h1 className="mt-2 font-display text-2xl font-bold text-site-fg sm:text-3xl">
            {category.name}
          </h1>
        </div>
      </section>

      <section className="py-8 sm:py-10">
        <SiteSidebarLayout
          sidebar={
            <CatalogFacetSidebar
              basePath={path}
              categories={categories}
              activeCategorySlug={category.slug}
              brands={brands}
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
          <CatalogToolbar basePath={path} filters={{ ...filters, categoryIds }} total={listing.total} />
          {listing.products.length === 0 ? (
            <p className="py-10 text-sm text-site-muted">Bu kategoride yayınlanmış ürün yok.</p>
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
