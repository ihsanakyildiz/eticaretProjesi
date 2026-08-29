"use client";

import { useEffect, useState } from "react";
import { ProductCard } from "@/components/site/catalog/product-card";
import { getRecentlyViewedProductsAction } from "@/app/(site)/urunler/actions";
import type { CatalogProductCard } from "@/lib/catalog-storefront";
import { RECENTLY_VIEWED_KEY } from "@/lib/recently-viewed";

type RailStatus = "loading" | "empty" | "ready";

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

function RailFrame({
  title,
  subtitle,
  eyebrow,
  children,
}: {
  title: string | null;
  subtitle: string | null;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-site-border py-12 sm:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {eyebrow ? (
          <p className="text-xs font-semibold tracking-wide text-site-primary uppercase">
            {eyebrow}
          </p>
        ) : null}
        {title ? (
          <h2 className="mt-1 font-display text-2xl font-bold text-site-fg sm:text-3xl">
            {title}
          </h2>
        ) : null}
        {subtitle ? <p className="mt-2 max-w-2xl text-sm text-site-muted">{subtitle}</p> : null}
        {children}
      </div>
    </section>
  );
}

export function RecentlyViewedRail({
  title,
  subtitle,
  eyebrow,
}: {
  title: string | null;
  subtitle: string | null;
  eyebrow?: string;
}) {
  const [products, setProducts] = useState<CatalogProductCard[]>([]);
  const [status, setStatus] = useState<RailStatus>("loading");

  useEffect(() => {
    const ids = readRecentIds();
    if (ids.length === 0) {
      setStatus("empty");
      return;
    }
    void getRecentlyViewedProductsAction(ids).then((rows) => {
      setProducts(rows);
      setStatus(rows.length > 0 ? "ready" : "empty");
    });
  }, []);

  switch (status) {
    case "empty":
      return null;
    case "loading":
      return (
        <RailFrame title={title} subtitle={subtitle} eyebrow={eyebrow}>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="animate-pulse overflow-hidden rounded-lg border border-site-border bg-site-card"
              >
                <div className="aspect-square bg-site-surface" />
                <div className="space-y-2 p-3">
                  <div className="h-3 w-1/3 rounded bg-site-surface" />
                  <div className="h-4 w-4/5 rounded bg-site-surface" />
                  <div className="h-4 w-1/2 rounded bg-site-surface" />
                </div>
              </div>
            ))}
          </div>
        </RailFrame>
      );
    case "ready":
      return (
        <RailFrame title={title} subtitle={subtitle} eyebrow={eyebrow}>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </RailFrame>
      );
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}
