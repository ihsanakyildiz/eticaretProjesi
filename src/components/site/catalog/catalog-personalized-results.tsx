"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ProductCard } from "@/components/site/catalog/product-card";
import {
  fetchAffinityProducts,
  fetchRecentlyViewedProducts,
} from "@/components/site/catalog/catalog-client-api";
import type { CatalogProductCard } from "@/lib/catalog-storefront";
import { RECENTLY_VIEWED_KEY } from "@/lib/recently-viewed";

function readRecentIds(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENTLY_VIEWED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => String(item)).filter(Boolean);
  } catch {
    return [];
  }
}

function affinityScore(
  product: CatalogProductCard,
  categories: Set<string>,
  brands: Set<string>,
) {
  const categoryHit = product.category?.slug && categories.has(product.category.slug) ? 2 : 0;
  const brandHit = product.brand?.slug && brands.has(product.brand.slug) ? 1 : 0;
  return categoryHit + brandHit;
}

export function PersonalizedProductGrid({
  products,
  merchandisedIds = [],
}: {
  products: CatalogProductCard[];
  merchandisedIds?: string[];
}) {
  const [ordered, setOrdered] = useState(products);

  useEffect(() => {
    setOrdered(products);
    const recentIds = readRecentIds().filter((id) => !products.some((product) => product.id === id));
    if (recentIds.length === 0) return;

    void fetchRecentlyViewedProducts(recentIds).then((recent) => {
      if (recent.length === 0) return;
      const categories = new Set(
        recent
          .map((item) => item.category?.slug)
          .filter((slug): slug is string => Boolean(slug)),
      );
      const brands = new Set(
        recent.map((item) => item.brand?.slug).filter((slug): slug is string => Boolean(slug)),
      );
      if (categories.size === 0 && brands.size === 0) return;

      const pinned = new Set(merchandisedIds);
      const head = products.filter((product) => pinned.has(product.id));
      const rest = products
        .filter((product) => !pinned.has(product.id))
        .slice()
        .sort((left, right) => {
          const delta =
            affinityScore(right, categories, brands) - affinityScore(left, categories, brands);
          return delta !== 0 ? delta : 0;
        });
      setOrdered([...head, ...rest]);
    });
  }, [merchandisedIds, products]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {ordered.map((product, index) => (
        <ProductCard key={product.id} product={product} imagePriority={index < 4} />
      ))}
    </div>
  );
}

export function InterestProductRail({ excludeIds }: { excludeIds: string[] }) {
  const [products, setProducts] = useState<CatalogProductCard[]>([]);
  const excludeKey = excludeIds.join(",");

  useEffect(() => {
    const ids = readRecentIds();
    if (ids.length === 0) {
      setProducts([]);
      return;
    }
    void fetchAffinityProducts(ids, excludeKey.split(",").filter(Boolean)).then(setProducts);
  }, [excludeKey]);

  if (products.length === 0) return null;

  return (
    <section className="mt-10 border-t border-site-border pt-8">
      <p className="text-xs font-semibold tracking-wide text-site-primary uppercase">
        Size özel
      </p>
      <h2 className="mt-1 font-display text-xl font-bold text-site-fg sm:text-2xl">
        İlginizi çekebilir
      </h2>
      <p className="mt-1 text-sm text-site-muted">
        Son baktığınız ürünlere yakın, popüler seçimler.
      </p>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

export function CatalogPersonalizedResults({
  products,
  merchandisedIds,
  pagination,
}: {
  products: CatalogProductCard[];
  merchandisedIds?: string[];
  pagination?: ReactNode;
}) {
  return (
    <>
      <PersonalizedProductGrid products={products} merchandisedIds={merchandisedIds} />
      {pagination}
      <InterestProductRail excludeIds={products.map((product) => product.id)} />
    </>
  );
}
