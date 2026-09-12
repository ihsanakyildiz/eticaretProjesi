"use server";

import { revalidatePath } from "next/cache";
import { ProductPlacementKind } from "@prisma/client";
import { bustCatalogCache } from "@/lib/catalog-products";
import { ensureRankingSchema } from "@/lib/ensure-ranking-schema";
import {
  categoryScopeKey,
  clampRankBoost,
  computeRankScore,
  searchScopeKey,
} from "@/lib/product-ranking";
import { prisma } from "@/lib/prisma";
import { normalizeSearchTerm } from "@/lib/search-suggest-types";
import { requirePermission } from "@/lib/staff-permissions";

const RANKING_PATH = "/admin/settings/ranking";

function refreshRankingViews() {
  revalidatePath(RANKING_PATH);
  bustCatalogCache();
}

export async function saveGlobalBoostAction(formData: FormData) {
  const gate = await requirePermission("settings_ranking", "update");
  if (!gate.ok) return;

  const id = String(formData.get("id") ?? "").trim();
  const boostScore = clampRankBoost(String(formData.get("boost") ?? "0"));
  if (!id) return;

  await ensureRankingSchema().catch(() => undefined);
  const row = await prisma.product.update({
    where: { id },
    data: { boostScore },
    select: { boostScore: true, clickCount: true, viewCount: true },
  });
  await prisma.product.update({
    where: { id },
    data: { rankScore: computeRankScore(row) },
  });
  refreshRankingViews();
}

export async function saveCategoryPlacementAction(formData: FormData) {
  const gate = await requirePermission("settings_ranking", "update");
  if (!gate.ok) return;

  const productId = String(formData.get("id") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  const boost = clampRankBoost(String(formData.get("boost") ?? "0"));
  if (!productId || !categoryId) return;

  await ensureRankingSchema().catch(() => undefined);
  const scopeKey = categoryScopeKey(categoryId);
  if (boost <= 0) {
    await prisma.productPlacement
      .delete({ where: { productId_scopeKey: { productId, scopeKey } } })
      .catch(() => undefined);
    refreshRankingViews();
    return;
  }

  await prisma.productPlacement.upsert({
    where: { productId_scopeKey: { productId, scopeKey } },
    create: {
      productId,
      kind: ProductPlacementKind.CATEGORY,
      scopeKey,
      categoryId,
      searchTerm: "",
      boost,
      isActive: true,
    },
    update: { boost, isActive: true, categoryId, searchTerm: "" },
  });
  refreshRankingViews();
}

export async function saveSearchPlacementAction(formData: FormData) {
  const gate = await requirePermission("settings_ranking", "update");
  if (!gate.ok) return;

  const productId = String(formData.get("id") ?? "").trim();
  const rawTerm = String(formData.get("term") ?? "");
  const searchTerm = normalizeSearchTerm(rawTerm);
  const boost = clampRankBoost(String(formData.get("boost") ?? "0"));
  if (!productId || searchTerm.length < 2) return;

  await ensureRankingSchema().catch(() => undefined);
  const scopeKey = searchScopeKey(searchTerm);
  if (boost <= 0) {
    await prisma.productPlacement
      .delete({ where: { productId_scopeKey: { productId, scopeKey } } })
      .catch(() => undefined);
    refreshRankingViews();
    return;
  }

  await prisma.productPlacement.upsert({
    where: { productId_scopeKey: { productId, scopeKey } },
    create: {
      productId,
      kind: ProductPlacementKind.SEARCH,
      scopeKey,
      categoryId: null,
      searchTerm,
      boost,
      isActive: true,
    },
    update: { boost, isActive: true, searchTerm, categoryId: null },
  });
  refreshRankingViews();
}
