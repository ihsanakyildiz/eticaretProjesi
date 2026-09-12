export const SEARCH_HISTORY_KEY = "ia-recent-searches";
export const SEARCH_HISTORY_MAX = 10;
export const SEARCH_SUGGEST_MIN_CHARS = 1;

export type SearchSuggestTerm = {
  term: string;
  display: string;
  href: string;
};

export type SearchSuggestEntity = {
  id: string;
  label: string;
  href: string;
  image: string | null;
  meta?: string | null;
};

export type SearchSuggestResponse = {
  terms: SearchSuggestTerm[];
  categories: SearchSuggestEntity[];
  brands: SearchSuggestEntity[];
  products: SearchSuggestEntity[];
};

export function normalizeSearchTerm(raw: string) {
  return raw.trim().replace(/\s+/g, " ").toLocaleLowerCase("tr-TR").slice(0, 160);
}

export function displaySearchTerm(raw: string) {
  return raw.trim().replace(/\s+/g, " ").slice(0, 160);
}

export function catalogSearchHref(catalogPath: string, query: string) {
  const q = displaySearchTerm(query);
  if (!q) return catalogPath;
  return `${catalogPath}?q=${encodeURIComponent(q)}`;
}
