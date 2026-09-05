import {
  parseCatalogSort,
  type CatalogListingFilters,
  type CatalogSort,
} from "@/lib/catalog-storefront";

export type CatalogSearchQuery = {
  sayfa?: string;
  sira?: string;
  marka?: string;
  min?: string;
  max?: string;
  filtre?: string;
  kampanya?: string;
  q?: string;
};

function parseListingQuery(raw: string | undefined): string | null {
  const query = raw?.trim().slice(0, 80) ?? "";
  return query || null;
}

export function parseCatalogSearchQuery(query: CatalogSearchQuery): {
  page: number;
  filters: Omit<CatalogListingFilters, "categoryIds">;
} {
  const requestedPage = Number.parseInt(query.sayfa ?? "1", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const minRaw = Number.parseFloat(String(query.min ?? ""));
  const maxRaw = Number.parseFloat(String(query.max ?? ""));
  return {
    page,
    filters: {
      sort: parseCatalogSort(query.sira),
      brandSlugs: String(query.marka ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      minMajor: Number.isFinite(minRaw) && minRaw > 0 ? minRaw : null,
      maxMajor: Number.isFinite(maxRaw) && maxRaw > 0 ? maxRaw : null,
      filterValueIds: String(query.filtre ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      campaignIds: String(query.kampanya ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      query: parseListingQuery(query.q),
    },
  };
}

export type CatalogListingHrefInput = {
  page?: number;
  sort?: CatalogSort;
  brandSlugs?: string[];
  minMajor?: number | null;
  maxMajor?: number | null;
  filterValueIds?: string[];
  campaignIds?: string[];
  query?: string | null;
};

export function catalogFiltersHref(
  basePath: string,
  filters: Omit<CatalogListingFilters, "categoryIds">,
  patch: CatalogListingHrefInput = {},
) {
  return catalogListingHref(basePath, {
    sort: patch.sort ?? filters.sort,
    brandSlugs: patch.brandSlugs ?? filters.brandSlugs,
    minMajor: "minMajor" in patch ? (patch.minMajor ?? null) : filters.minMajor,
    maxMajor: "maxMajor" in patch ? (patch.maxMajor ?? null) : filters.maxMajor,
    filterValueIds: patch.filterValueIds ?? filters.filterValueIds,
    campaignIds: patch.campaignIds ?? filters.campaignIds,
    query: "query" in patch ? (patch.query ?? null) : filters.query,
    page: patch.page,
  });
}

export function catalogListingHref(basePath: string, next: CatalogListingHrefInput) {
  const params = new URLSearchParams();
  if (next.sort && next.sort !== "yeni") params.set("sira", next.sort);
  if (next.brandSlugs && next.brandSlugs.length > 0) {
    params.set("marka", next.brandSlugs.join(","));
  }
  if (next.minMajor != null) params.set("min", String(next.minMajor));
  if (next.maxMajor != null) params.set("max", String(next.maxMajor));
  if (next.filterValueIds && next.filterValueIds.length > 0) {
    params.set("filtre", next.filterValueIds.join(","));
  }
  if (next.campaignIds && next.campaignIds.length > 0) {
    params.set("kampanya", next.campaignIds.join(","));
  }
  if (next.query?.trim()) params.set("q", next.query.trim().slice(0, 80));
  if (next.page && next.page > 1) params.set("sayfa", String(next.page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
