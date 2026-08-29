import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
  enforceCatalogIndex,
  enforceResolvedBrand,
  enforceResolvedCategory,
  enforceResolvedProduct,
  resolveUrlStructure,
} from "@/lib/catalog-routes";
import {
  isCatalogHubMatch,
  joinPublicPath,
  matchPublicCatalogPath,
} from "@/lib/url-structure";

export async function catalogCatchAllMetadata({
  params,
}: {
  params: Promise<{ path: string[] }>;
}): Promise<Metadata> {
  const { path } = await params;
  const pathname = joinPublicPath(...path);
  const urls = await resolveUrlStructure();
  const match = matchPublicCatalogPath(pathname, urls);
  if (!match) return { title: "Sayfa bulunamadı" };

  switch (match.kind) {
    case "catalog":
      return catalogListingMetadata();
    case "category-index":
      return catalogCategoryIndexMetadata();
    case "brand-index":
      return catalogBrandIndexMetadata();
    case "category":
      return catalogCategoryMetadata(match.slug);
    case "brand":
      return catalogBrandMetadata(match.slug);
    case "product":
      return catalogProductMetadata(match.slug);
    default: {
      const _exhaustive: never = match;
      return _exhaustive;
    }
  }
}

export async function renderCatalogCatchAll({
  path,
  search,
}: {
  path: string[];
  search: CatalogSearchParams;
}) {
  const pathname = joinPublicPath(...path);
  const urls = await resolveUrlStructure();
  const match = matchPublicCatalogPath(pathname, urls);
  if (!match) notFound();

  switch (match.kind) {
    case "catalog":
      await enforceCatalogIndex(urls.catalog, search);
      return <CatalogListingScreen search={search} urls={urls} />;
    case "category-index":
      return <CatalogCategoryIndexScreen urls={urls} />;
    case "brand-index":
      return <CatalogBrandIndexScreen urls={urls} />;
    case "category": {
      const resolved = await enforceResolvedCategory(pathname, match.slug, match.urlId, search);
      return <CatalogCategoryScreen slug={resolved.slug} search={search} urls={resolved.urls} />;
    }
    case "brand": {
      const resolved = await enforceResolvedBrand(pathname, match.slug, match.urlId, search);
      return <CatalogBrandScreen slug={resolved.slug} search={search} urls={resolved.urls} />;
    }
    case "product": {
      const resolved = await enforceResolvedProduct(pathname, match.slug, match.urlId);
      return <CatalogProductScreen slug={resolved.slug} urls={resolved.urls} />;
    }
    default: {
      const _exhaustive: never = match;
      return _exhaustive;
    }
  }
}

export async function renderCatalogHubIfMatch(
  slug: string,
  search: CatalogSearchParams,
) {
  const urls = await resolveUrlStructure();
  const match = matchPublicCatalogPath(joinPublicPath(slug), urls);
  if (!isCatalogHubMatch(match)) return null;

  switch (match.kind) {
    case "catalog":
      await enforceCatalogIndex(urls.catalog, search);
      return <CatalogListingScreen search={search} urls={urls} />;
    case "category-index":
      return <CatalogCategoryIndexScreen urls={urls} />;
    case "brand-index":
      return <CatalogBrandIndexScreen urls={urls} />;
    default: {
      const _exhaustive: never = match;
      return _exhaustive;
    }
  }
}

export async function catalogHubMetadataIfMatch(slug: string): Promise<Metadata | null> {
  const urls = await resolveUrlStructure();
  const match = matchPublicCatalogPath(joinPublicPath(slug), urls);
  if (!isCatalogHubMatch(match)) return null;

  switch (match.kind) {
    case "catalog":
      return catalogListingMetadata();
    case "category-index":
      return catalogCategoryIndexMetadata();
    case "brand-index":
      return catalogBrandIndexMetadata();
    default: {
      const _exhaustive: never = match;
      return _exhaustive;
    }
  }
}
