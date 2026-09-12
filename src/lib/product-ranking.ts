import { normalizeSearchTerm } from "@/lib/search-suggest-types";

export const RANK_BOOST_WEIGHT = 1000;
export const RANK_CLICK_WEIGHT = 80;
export const RANK_VIEW_WEIGHT = 20;
export const RANK_SCORE_MAX = 99999;

export type RankingScope = "category" | "search" | "global";

export function clampRankBoost(raw: string | number) {
  const parsed = typeof raw === "number" ? raw : Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(RANK_SCORE_MAX, Math.max(0, Math.trunc(parsed)));
}

export function computeRankScore(input: {
  boostScore: number;
  clickCount: number;
  viewCount: number;
}) {
  const boost = clampRankBoost(input.boostScore);
  const clicks = Math.max(0, input.clickCount);
  const views = Math.max(0, input.viewCount);
  return (
    boost * RANK_BOOST_WEIGHT +
    Math.floor(Math.log1p(clicks) * RANK_CLICK_WEIGHT + Math.log1p(views) * RANK_VIEW_WEIGHT)
  );
}

export function categoryScopeKey(categoryId: string) {
  return `category:${categoryId}`;
}

export function searchScopeKey(term: string) {
  return `search:${normalizeSearchTerm(term)}`;
}

export function searchPlacementKeys(query: string) {
  const normalized = normalizeSearchTerm(query);
  if (normalized.length < 2) return [];
  const keys = new Set<string>([normalized]);
  const parts = normalized.split(" ").filter(Boolean);
  for (let count = parts.length; count >= 2; count -= 1) {
    keys.add(parts.slice(0, count).join(" "));
  }
  if ((parts[0]?.length ?? 0) >= 3) keys.add(parts[0]);
  return [...keys];
}

export function parseRankingScope(raw: string | undefined): RankingScope {
  switch (raw) {
    case "category":
    case "search":
    case "global":
      return raw;
    default:
      return "category";
  }
}
