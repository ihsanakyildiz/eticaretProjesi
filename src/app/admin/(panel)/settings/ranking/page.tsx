import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { TrendingUp } from "lucide-react";
import { buildCategoryTree, collectDescendantIds, flattenCategoryTree } from "@/lib/category-tree";
import { ensureRankingSchema } from "@/lib/ensure-ranking-schema";
import { prisma } from "@/lib/prisma";
import {
  categoryScopeKey,
  parseRankingScope,
  searchScopeKey,
  type RankingScope,
} from "@/lib/product-ranking";
import { normalizeSearchTerm } from "@/lib/search-suggest-types";
import { RankingTable, type RankingProductRow } from "./ranking-table";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ürün sıralaması",
  description: "Kategori ve arama vitrininde ürünleri öne çıkarın",
};

const PAGE_SIZE = 40;

const SCOPES: { id: RankingScope; label: string; href: string }[] = [
  { id: "category", label: "Kategori vitrini", href: "/admin/settings/ranking?scope=category" },
  { id: "search", label: "Arama vitrini", href: "/admin/settings/ranking?scope=search" },
  { id: "global", label: "Genel popülerlik", href: "/admin/settings/ranking?scope=global" },
];

function firstParam(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export default async function RankingSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const scope = parseRankingScope(firstParam(params.scope));
  const categoryId = firstParam(params.categoryId);
  const term = firstParam(params.term);
  const query = firstParam(params.q);

  await ensureRankingSchema().catch(() => undefined);

  const categories = await prisma.productCategory.findMany({
    where: { isActive: true },
    select: {
      id: true,
      parentId: true,
      name: true,
      slug: true,
      sortOrder: true,
      isActive: true,
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  const categoryOptions = flattenCategoryTree(buildCategoryTree(categories));

  const textWhere =
    query.length >= 2
      ? {
          OR: [
            { title: { contains: query } },
            { sku: { contains: query } },
            { brand: { is: { name: { contains: query } } } },
            { category: { is: { name: { contains: query } } } },
          ],
        }
      : {};

  let productWhere: Prisma.ProductWhereInput = { isActive: true };
  let canQuery = scope === "global";

  switch (scope) {
    case "category": {
      if (categoryId) {
        const ids = [...collectDescendantIds(categories, categoryId)];
        productWhere = { isActive: true, categoryId: { in: ids }, ...textWhere };
        canQuery = true;
      }
      break;
    }
    case "search": {
      const needle = normalizeSearchTerm(term);
      if (needle.length >= 2) {
        productWhere = {
          isActive: true,
          OR: [
            { title: { contains: needle } },
            { sku: { contains: needle } },
            { brand: { is: { name: { contains: needle } } } },
            { category: { is: { name: { contains: needle } } } },
          ],
        };
        canQuery = true;
      }
      break;
    }
    case "global":
      productWhere = { isActive: true, ...textWhere };
      break;
    default: {
      const _exhaustive: never = scope;
      return _exhaustive;
    }
  }

  const products = canQuery
    ? await prisma.product
        .findMany({
          where: productWhere,
          orderBy: [{ rankScore: "desc" }, { clickCount: "desc" }, { title: "asc" }],
          take: PAGE_SIZE,
          select: {
            id: true,
            title: true,
            sku: true,
            image: true,
            viewCount: true,
            clickCount: true,
            boostScore: true,
            rankScore: true,
            category: { select: { name: true } },
          },
        })
        .catch(() => [])
    : [];

  const scopeKey =
    scope === "category" && categoryId
      ? categoryScopeKey(categoryId)
      : scope === "search" && term
        ? searchScopeKey(term)
        : null;

  const placements =
    scopeKey && products.length > 0
      ? await prisma.productPlacement
          .findMany({
            where: {
              scopeKey,
              productId: { in: products.map((product) => product.id) },
            },
            select: { productId: true, boost: true },
          })
          .catch(() => [])
      : [];
  const placementByProduct = new Map(placements.map((row) => [row.productId, row.boost]));

  const rows: RankingProductRow[] = products.map((product) => ({
    id: product.id,
    title: product.title,
    sku: product.sku,
    image: product.image,
    categoryName: product.category?.name ?? null,
    viewCount: product.viewCount,
    clickCount: product.clickCount,
    rankScore: product.rankScore,
    boost:
      scope === "global" ? product.boostScore : (placementByProduct.get(product.id) ?? 0),
  }));

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Ayarlar</p>
        <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold text-slate-800 sm:text-2xl">
          <TrendingUp className="h-6 w-6 text-[#405189]" />
          Ürün sıralaması
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Müşteri tıklama ve görüntülemeleri organik skoru otomatik yükseltir. Vitrin puanı ise
          seçtiğiniz kategoride veya aramada ürünü listenin en üstüne taşır. Stokta olmayan veya
          gizli ürünler vitrine çıkmaz.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {SCOPES.map((item) => {
          const active = item.id === scope;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={
                active
                  ? "rounded-md bg-[#405189] px-3 py-1.5 text-sm font-semibold text-white"
                  : "rounded-md border border-[#e9ebec] bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              }
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <form
        method="get"
        className="rounded-lg border border-[#e9ebec] bg-white p-4 shadow-sm"
      >
        <input type="hidden" name="scope" value={scope} />
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          {scope === "category" ? (
            <select
              name="categoryId"
              defaultValue={categoryId}
              className="w-full rounded-md border border-[#e9ebec] px-3 py-2.5 text-sm outline-none focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20"
            >
              <option value="">Kategori seçin</option>
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {`${"— ".repeat(category.depth)}${category.name}`}
                </option>
              ))}
            </select>
          ) : null}
          {scope === "search" ? (
            <input
              name="term"
              defaultValue={term}
              placeholder="Örn. gram altın"
              className="w-full rounded-md border border-[#e9ebec] px-3 py-2.5 text-sm outline-none focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20"
            />
          ) : null}
          {scope !== "search" ? (
            <input
              name="q"
              defaultValue={query}
              placeholder="Ürün veya SKU ara…"
              className="w-full rounded-md border border-[#e9ebec] px-3 py-2.5 text-sm outline-none focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20"
            />
          ) : (
            <div />
          )}
          <button
            type="submit"
            className="rounded-md bg-[#0ab39c] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#099885]"
          >
            Listele
          </button>
        </div>
      </form>

      <RankingTable scope={scope} categoryId={categoryId} term={term} rows={rows} />
    </div>
  );
}
