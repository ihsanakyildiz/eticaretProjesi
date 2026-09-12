import "server-only";

import { catalogCardPrice } from "@/lib/catalog-storefront";
import { ensureSearchTermsTable } from "@/lib/ensure-search-schema";
import { formatMinorTry, taxIncludedMinor } from "@/lib/product-money";
import { prisma } from "@/lib/prisma";
import { getSettingsMap } from "@/lib/settings";
import { ensureRankingSchema } from "@/lib/ensure-ranking-schema";
import { storefrontListingWhere } from "@/lib/storefront-product-where";
import {
  catalogSearchHref,
  displaySearchTerm,
  normalizeSearchTerm,
  type SearchSuggestResponse,
} from "@/lib/search-suggest-types";
import {
  parseUrlStructure,
  publicCatalogPath,
  publicProductBrandHref,
  publicProductCategoryHref,
  publicProductHref,
} from "@/lib/url-structure";

const TERM_LIMIT = 8;
const ENTITY_LIMIT = 5;
const PRODUCT_LIMIT = 6;

function productTextWhere(query: string) {
  return {
    OR: [
      { title: { contains: query } },
      { slug: { contains: query } },
      { sku: { contains: query } },
      { brand: { is: { name: { contains: query } } } },
      { category: { is: { name: { contains: query } } } },
    ],
  };
}

export async function recordSearchTerm(raw: string) {
  const term = normalizeSearchTerm(raw);
  const display = displaySearchTerm(raw);
  if (term.length < 2) return;

  await ensureSearchTermsTable().catch(() => undefined);
  try {
    await prisma.searchTerm.upsert({
      where: { term },
      create: {
        term,
        displayTerm: display,
        searchCount: 1,
      },
      update: {
        searchCount: { increment: 1 },
      },
    });
  } catch (error) {
    console.error(error);
  }
}

export async function getSearchSuggestions(raw: string): Promise<SearchSuggestResponse> {
  await Promise.all([
    ensureSearchTermsTable().catch(() => undefined),
    ensureRankingSchema().catch(() => undefined),
  ]);
  const query = normalizeSearchTerm(raw);
  const settings = await getSettingsMap().catch(() => ({}) as Record<string, string>);
  const urls = parseUrlStructure(settings);
  const catalogPath = publicCatalogPath(urls);

  const empty: SearchSuggestResponse = {
    terms: [],
    categories: [],
    brands: [],
    products: [],
  };

  try {
    const terms = await prisma.searchTerm.findMany({
      where: {
        isActive: true,
        ...(query
          ? {
              OR: [
                { term: { contains: query } },
                { displayTerm: { contains: query } },
              ],
            }
          : {}),
      },
      orderBy: [{ score: "desc" }, { searchCount: "desc" }, { displayTerm: "asc" }],
      take: TERM_LIMIT,
      select: { term: true, displayTerm: true },
    });

    empty.terms = terms.map((item) => ({
      term: item.term,
      display: item.displayTerm,
      href: catalogSearchHref(catalogPath, item.displayTerm),
    }));

    if (query.length < 2) return empty;

    const [categories, brands, products] = await Promise.all([
      prisma.productCategory.findMany({
        where: { isActive: true, name: { contains: query } },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        take: ENTITY_LIMIT,
        select: { id: true, name: true, slug: true, urlId: true, image: true },
      }),
      prisma.brand.findMany({
        where: { isActive: true, name: { contains: query } },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        take: ENTITY_LIMIT,
        select: { id: true, name: true, slug: true, urlId: true, logo: true },
      }),
      prisma.product.findMany({
        where: storefrontListingWhere(productTextWhere(query)),
        orderBy: [{ rankScore: "desc" }, { clickCount: "desc" }, { viewCount: "desc" }],
        take: PRODUCT_LIMIT,
        select: {
          id: true,
          title: true,
          slug: true,
          urlId: true,
          image: true,
          showPrice: true,
          taxRatePercent: true,
          basePriceMinor: true,
          compareAtMinor: true,
          saleStartsAt: true,
          saleEndsAt: true,
          variants: {
            where: { isActive: true },
            orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }],
            take: 4,
            select: {
              priceMinor: true,
              compareAtMinor: true,
              saleStartsAt: true,
              saleEndsAt: true,
              stockQuantity: true,
              isDefault: true,
            },
          },
        },
      }),
    ]);

    return {
      terms: empty.terms,
      categories: categories.map((category) => ({
        id: category.id,
        label: category.name,
        href: publicProductCategoryHref(category.slug, urls, category.urlId),
        image: category.image,
        meta: "Kategori",
      })),
      brands: brands.map((brand) => ({
        id: brand.id,
        label: brand.name,
        href: publicProductBrandHref(brand.slug, urls, brand.urlId),
        image: brand.logo,
        meta: "Marka",
      })),
      products: products.map((product) => {
        const priced = catalogCardPrice(product);
        return {
          id: product.id,
          label: product.title,
          href: publicProductHref(product.slug, urls, product.urlId),
          image: product.image,
          meta: product.showPrice
            ? formatMinorTry(taxIncludedMinor(priced.priceMinor, product.taxRatePercent))
            : null,
        };
      }),
    };
  } catch (error) {
    console.error(error);
    return empty;
  }
}
