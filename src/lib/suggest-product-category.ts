import {
  getCategoryBreadcrumb,
  type CategoryNodeBase,
} from "@/lib/category-tree";
import { slugify } from "@/lib/slug";

const STOPWORDS = new Set([
  "ve",
  "veya",
  "ile",
  "icin",
  "bir",
  "bu",
  "su",
  "da",
  "de",
  "den",
  "dan",
  "the",
  "of",
  "and",
  "yeni",
  "orijinal",
  "orjinal",
  "urun",
  "product",
  "adet",
  "paket",
  "set",
  "cm",
  "mm",
  "kg",
]);

const MIN_SCORE = 18;

export type SuggestedProductCategory = {
  id: string;
  name: string;
  pathLabel: string;
};

function tokensOf(value: string) {
  return slugify(value)
    .split("-")
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));
}

function similarToken(left: string, right: string) {
  if (left === right) return true;
  if (left.length < 4 || right.length < 4) return false;
  return left.startsWith(right) || right.startsWith(left);
}

function tokenOverlap(titleTokens: string[], candidateTokens: string[]) {
  let score = 0;
  let hits = 0;
  for (const candidate of candidateTokens) {
    const matched = titleTokens.some((token) => similarToken(token, candidate));
    if (!matched) continue;
    hits += 1;
    score += candidate.length >= 6 ? 16 : 12;
  }
  return { score, hits };
}

export function suggestProductCategory(
  title: string,
  categories: CategoryNodeBase[],
): SuggestedProductCategory | null {
  const titleTokens = tokensOf(title);
  if (titleTokens.length === 0) return null;

  const childIds = new Set(
    categories.map((item) => item.parentId).filter((id): id is string => Boolean(id)),
  );

  let best: { id: string; score: number; depth: number } | null = null;

  for (const category of categories) {
    if (!category.isActive) continue;
    const trail = getCategoryBreadcrumb(categories, category.id);
    if (trail.length === 0) continue;

    const nameTokens = tokensOf(category.name);
    if (nameTokens.length === 0) continue;

    const nameMatch = tokenOverlap(titleTokens, nameTokens);
    if (nameMatch.hits === 0) continue;

    const pathTokens = tokensOf(trail.map((item) => item.name).join(" "));
    const pathMatch = tokenOverlap(titleTokens, pathTokens);
    const isLeaf = !childIds.has(category.id);
    const shortName = slugify(category.name).length <= 3;
    if (shortName && pathMatch.hits < 2) continue;

    const score =
      nameMatch.score * 2 +
      pathMatch.score +
      trail.length * 3 +
      (isLeaf ? 8 : 0) +
      (nameMatch.hits === nameTokens.length ? 10 : 0);

    if (score < MIN_SCORE) continue;
    if (
      !best ||
      score > best.score ||
      (score === best.score && trail.length > best.depth)
    ) {
      best = { id: category.id, score, depth: trail.length };
    }
  }

  if (!best) return null;
  const trail = getCategoryBreadcrumb(categories, best.id);
  const leaf = trail.at(-1);
  if (!leaf) return null;
  return {
    id: leaf.id,
    name: leaf.name,
    pathLabel: trail.map((item) => item.name).join(" › "),
  };
}
