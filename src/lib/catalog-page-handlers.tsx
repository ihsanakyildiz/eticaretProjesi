import {
  CatalogListingScreen,
  catalogListingMetadata,
  type CatalogSearchParams,
} from "@/components/site/catalog/catalog-listing-screen";
import {
  CatalogBrandIndexScreen,
  catalogBrandIndexMetadata,
} from "@/components/site/catalog/catalog-brand-index-screen";
import { CatalogBrandScreen, catalogBrandMetadata } from "@/components/site/catalog/catalog-brand-screen";
import {
  CatalogCategoryIndexScreen,
  catalogCategoryIndexMetadata,
} from "@/components/site/catalog/catalog-category-index-screen";
import {
  CatalogCategoryScreen,
  catalogCategoryMetadata,
} from "@/components/site/catalog/catalog-category-screen";
import { CatalogProductScreen, catalogProductMetadata } from "@/components/site/catalog/catalog-product-screen";
import {
  enforceBrandIndex,
  enforceBrandPage,
  enforceCatalogIndex,
  enforceCategoryIndex,
  enforceCategoryPage,
  enforceProductPage,
} from "@/lib/catalog-routes";
import type { UrlBrandPath, UrlCatalogPath, UrlCategoryPath, UrlProductPath } from "@/lib/url-structure";

export { catalogListingMetadata, catalogBrandIndexMetadata, catalogCategoryIndexMetadata };

export function catalogIndexPage(routeKey: UrlCatalogPath) {
  return async function CatalogIndexRoute({
    searchParams,
  }: {
    searchParams: Promise<CatalogSearchParams>;
  }) {
    const search = await searchParams;
    const urls = await enforceCatalogIndex(routeKey, search);
    return <CatalogListingScreen search={search} urls={urls} />;
  };
}

export function categoryIndexPage(routeKey: UrlCategoryPath) {
  return async function CategoryIndexRoute() {
    const urls = await enforceCategoryIndex(routeKey);
    return <CatalogCategoryIndexScreen urls={urls} />;
  };
}

function parseRouteUrlId(urlId?: string) {
  if (!urlId || !/^\d+$/.test(urlId)) return undefined;
  return Number(urlId);
}

export function categoryDetailPage(routeKey: UrlCategoryPath) {
  return async function CategoryDetailRoute({
    params,
    searchParams,
  }: {
    params: Promise<{ slug: string; urlId?: string }>;
    searchParams: Promise<CatalogSearchParams>;
  }) {
    const [{ slug, urlId }, search] = await Promise.all([params, searchParams]);
    const urls = await enforceCategoryPage(routeKey, slug, search, parseRouteUrlId(urlId));
    return <CatalogCategoryScreen slug={slug} search={search} urls={urls} />;
  };
}

export function brandIndexPage(routeKey: UrlBrandPath) {
  return async function BrandIndexRoute() {
    const urls = await enforceBrandIndex(routeKey);
    return <CatalogBrandIndexScreen urls={urls} />;
  };
}

export function brandDetailPage(routeKey: UrlBrandPath) {
  return async function BrandDetailRoute({
    params,
    searchParams,
  }: {
    params: Promise<{ slug: string; urlId?: string }>;
    searchParams: Promise<CatalogSearchParams>;
  }) {
    const [{ slug, urlId }, search] = await Promise.all([params, searchParams]);
    const urls = await enforceBrandPage(routeKey, slug, search, parseRouteUrlId(urlId));
    return <CatalogBrandScreen slug={slug} search={search} urls={urls} />;
  };
}

export function productDetailPage(routeKey: UrlProductPath) {
  return async function ProductDetailRoute({
    params,
  }: {
    params: Promise<{ slug: string; urlId?: string }>;
  }) {
    const { slug, urlId } = await params;
    const urls = await enforceProductPage(routeKey, slug, parseRouteUrlId(urlId));
    return <CatalogProductScreen slug={slug} urls={urls} />;
  };
}

export async function categoryDetailMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return catalogCategoryMetadata(slug);
}

export async function brandDetailMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return catalogBrandMetadata(slug);
}

export async function productDetailMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return catalogProductMetadata(slug);
}
