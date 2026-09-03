export const URL_CATALOG_PATHS = ["katalog", "arama", "magaza", "urunler"] as const;
export const URL_PRODUCT_PATHS = ["", "urun", "urunler"] as const;
export const URL_CATEGORY_PATHS = ["kategori", "urunler/kategori"] as const;
export const URL_BRAND_PATHS = ["marka", "urunler/marka"] as const;

export type UrlCatalogPath = string;
export type UrlProductPath = string;
export type UrlCategoryPath = string;
export type UrlBrandPath = string;

export type UrlStructure = {
  catalog: string;
  product: string;
  category: string;
  brand: string;
  productIncludeId: boolean;
  categoryIncludeId: boolean;
  brandIncludeId: boolean;
};

export const DEFAULT_URL_STRUCTURE: UrlStructure = {
  catalog: "katalog",
  product: "",
  category: "kategori",
  brand: "marka",
  productIncludeId: false,
  categoryIncludeId: false,
  brandIncludeId: false,
};

export const URL_CATALOG_TITLES: Record<(typeof URL_CATALOG_PATHS)[number], string> = {
  katalog: "Katalog",
  arama: "Arama",
  magaza: "Mağaza",
  urunler: "Ürünler",
};

export const URL_PREFIX_SUGGESTIONS = {
  catalog: [
    { value: "katalog", label: "/katalog" },
    { value: "arama", label: "/arama" },
    { value: "magaza", label: "/magaza" },
    { value: "urunler", label: "/urunler" },
  ],
  product: [
    { value: "", label: "Kök /ürün-slug" },
    { value: "urun", label: "/urun" },
    { value: "urunler", label: "/urunler" },
  ],
  category: [
    { value: "kategori", label: "/kategori" },
    { value: "urunler/kategori", label: "/urunler/kategori" },
  ],
  brand: [
    { value: "marka", label: "/marka" },
    { value: "urunler/marka", label: "/urunler/marka" },
  ],
} as const;

const STATIC_RESERVED_SEGMENTS = [
  "admin",
  "api",
  "projeler",
  "blog",
  "yapilan-isler",
  "anasayfa",
  "giris",
  "kayit",
  "uye",
  "sifremi-unuttum",
  "sifre-sifirla",
  "paket",
  "sepet",
  "odeme",
  "siparis",
  "uploads",
  "_next",
] as const;

const TURKISH_ASCII: Record<string, string> = {
  ç: "c",
  ğ: "g",
  ı: "i",
  i̇: "i",
  ö: "o",
  ş: "s",
  ü: "u",
};

function foldUrlSegment(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/[çğıöşü]/g, (char) => TURKISH_ASCII[char] ?? char)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function sanitizeUrlPrefix(raw: string, fallback: string, allowEmpty = false) {
  const parts = String(raw ?? "")
    .trim()
    .replace(/\\/g, "/")
    .split("/")
    .map(foldUrlSegment)
    .filter(Boolean);

  if (parts.length === 0) return allowEmpty ? "" : fallback;

  const first = parts[0] ?? "";
  if ((STATIC_RESERVED_SEGMENTS as readonly string[]).includes(first)) {
    return allowEmpty ? "" : fallback;
  }

  return parts.join("/");
}

function parseSettingFlag(value: string | undefined) {
  return value === "true" || value === "1" || value === "on";
}

export function parseUrlStructure(settings: Record<string, string> = {}): UrlStructure {
  return {
    catalog: sanitizeUrlPrefix(settings.url_catalog_path ?? "", DEFAULT_URL_STRUCTURE.catalog),
    product: sanitizeUrlPrefix(settings.url_product_path ?? "", "", true),
    category: sanitizeUrlPrefix(settings.url_category_path ?? "", DEFAULT_URL_STRUCTURE.category),
    brand: sanitizeUrlPrefix(settings.url_brand_path ?? "", DEFAULT_URL_STRUCTURE.brand),
    productIncludeId: parseSettingFlag(settings.url_product_include_id),
    categoryIncludeId: parseSettingFlag(settings.url_category_include_id),
    brandIncludeId: parseSettingFlag(settings.url_brand_include_id),
  };
}

export function joinPublicPath(...parts: Array<string | number | null | undefined>) {
  const cleaned = parts
    .flatMap((part) => String(part ?? "").split("/"))
    .map((part) => part.trim())
    .filter(Boolean);
  return `/${cleaned.join("/")}`;
}

export function publicCatalogPath(structure: UrlStructure = DEFAULT_URL_STRUCTURE) {
  return joinPublicPath(structure.catalog);
}

export function publicCategoryIndexPath(structure: UrlStructure = DEFAULT_URL_STRUCTURE) {
  return joinPublicPath(structure.category);
}

export function publicBrandIndexPath(structure: UrlStructure = DEFAULT_URL_STRUCTURE) {
  return joinPublicPath(structure.brand);
}

function withOptionalId(includeId: boolean, urlId?: number | null) {
  if (!includeId || urlId == null || !Number.isFinite(urlId) || urlId <= 0) return [];
  return [String(Math.trunc(urlId))];
}

export function publicProductHref(
  slug: string,
  structure: UrlStructure = DEFAULT_URL_STRUCTURE,
  urlId?: number | null,
) {
  return joinPublicPath(structure.product, slug, ...withOptionalId(structure.productIncludeId, urlId));
}

export function publicProductCategoryHref(
  slug: string,
  structure: UrlStructure = DEFAULT_URL_STRUCTURE,
  urlId?: number | null,
) {
  return joinPublicPath(structure.category, slug, ...withOptionalId(structure.categoryIncludeId, urlId));
}

export function publicProductBrandHref(
  slug: string,
  structure: UrlStructure = DEFAULT_URL_STRUCTURE,
  urlId?: number | null,
) {
  return joinPublicPath(structure.brand, slug, ...withOptionalId(structure.brandIncludeId, urlId));
}

export function firstSegment(path: string) {
  return path.split("/").filter(Boolean)[0] ?? "";
}

export function pathSegments(path: string) {
  return path.split("/").filter(Boolean);
}

export function systemReservedFirstSegments() {
  return new Set<string>(STATIC_RESERVED_SEGMENTS);
}

export function reservedFirstSegments(structure: UrlStructure = DEFAULT_URL_STRUCTURE) {
  const segments = new Set<string>(STATIC_RESERVED_SEGMENTS);
  for (const path of [structure.catalog, structure.category, structure.brand, structure.product]) {
    const segment = firstSegment(path);
    if (segment) segments.add(segment);
  }
  for (const alias of [
    ...URL_CATALOG_PATHS,
    ...URL_CATEGORY_PATHS,
    ...URL_BRAND_PATHS,
    ...URL_PRODUCT_PATHS,
  ]) {
    const segment = firstSegment(alias);
    if (segment) segments.add(segment);
  }
  return segments;
}

export function catalogHubTitle(structure: UrlStructure = DEFAULT_URL_STRUCTURE) {
  const known = URL_CATALOG_TITLES[structure.catalog as keyof typeof URL_CATALOG_TITLES];
  if (known) return known;
  const last = pathSegments(structure.catalog).at(-1) ?? "katalog";
  return last.charAt(0).toUpperCase() + last.slice(1);
}

export function urlStructureExamples(structure: UrlStructure = DEFAULT_URL_STRUCTURE) {
  return {
    product: publicProductHref("test-urunu-ekliyorum", structure, 1),
    category: publicProductCategoryHref("giyim", structure, 1),
    search: `${publicCatalogPath(structure)}?q=test`,
    brand: publicProductBrandHref("ornek-marka", structure, 1),
  };
}

export function urlPrefixCollisions(structure: UrlStructure) {
  const entries: Array<{ key: "catalog" | "category" | "brand" | "product"; path: string }> = [
    { key: "catalog", path: structure.catalog },
    { key: "category", path: structure.category },
    { key: "brand", path: structure.brand },
  ];
  if (structure.product) entries.push({ key: "product", path: structure.product });

  const collisions: string[] = [];
  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      const left = entries[i]!;
      const right = entries[j]!;
      if (left.path === right.path) {
        collisions.push(`${left.path} birden fazla yerde kullanılıyor.`);
      }
    }
  }
  return collisions;
}

export type CatalogPathMatch =
  | { kind: "catalog" }
  | { kind: "category-index" }
  | { kind: "brand-index" }
  | { kind: "category"; slug: string; urlId?: number }
  | { kind: "brand"; slug: string; urlId?: number }
  | { kind: "product"; slug: string; urlId?: number };

function startsWithSegments(path: string[], prefix: string[]) {
  return prefix.length > 0 && prefix.every((segment, index) => path[index] === segment);
}

function parseEntityRest(rest: string[]): { slug: string; urlId?: number } | null {
  if (rest.length === 1 && rest[0]) return { slug: rest[0] };
  if (rest.length === 2 && rest[0] && /^\d+$/.test(rest[1] ?? "")) {
    return { slug: rest[0], urlId: Number(rest[1]) };
  }
  return null;
}

export function matchPublicCatalogPath(
  pathname: string,
  structure: UrlStructure,
): CatalogPathMatch | null {
  const path = pathSegments(pathname);
  const candidates: Array<{
    kind: "catalog" | "category" | "brand" | "product";
    prefix: string[];
  }> = [
    { kind: "category", prefix: pathSegments(structure.category) },
    { kind: "brand", prefix: pathSegments(structure.brand) },
    { kind: "product", prefix: pathSegments(structure.product) },
    { kind: "catalog", prefix: pathSegments(structure.catalog) },
  ];
  candidates.sort((left, right) => right.prefix.length - left.prefix.length);

  for (const candidate of candidates) {
    if (candidate.prefix.length === 0) continue;
    if (!startsWithSegments(path, candidate.prefix)) continue;
    const rest = path.slice(candidate.prefix.length);

    if (candidate.kind === "catalog") {
      if (rest.length === 0) return { kind: "catalog" };
      continue;
    }

    if (rest.length === 0) {
      if (candidate.kind === "category") return { kind: "category-index" };
      if (candidate.kind === "brand") return { kind: "brand-index" };
      continue;
    }

    const entity = parseEntityRest(rest);
    if (!entity) continue;
    if (candidate.kind === "category") return { kind: "category", ...entity };
    if (candidate.kind === "brand") return { kind: "brand", ...entity };
    return { kind: "product", ...entity };
  }

  if (path.length === 2 && path[0] && /^\d+$/.test(path[1] ?? "")) {
    return { kind: "product", slug: path[0], urlId: Number(path[1]) };
  }

  return null;
}

export function isCatalogHubMatch(
  match: CatalogPathMatch | null,
): match is Extract<CatalogPathMatch, { kind: "catalog" | "category-index" | "brand-index" }> {
  return match?.kind === "catalog" || match?.kind === "category-index" || match?.kind === "brand-index";
}

export function appendSearchParams(
  path: string,
  search: Record<string, string | string[] | undefined>,
) {
  const params = new URLSearchParams();
  for (const [key, raw] of Object.entries(search)) {
    if (raw == null) continue;
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}
