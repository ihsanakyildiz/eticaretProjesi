import type { CatalogProductCard } from "@/lib/catalog-storefront";

export type ProductEventKind = "click" | "view";

export function trackProductEvent(productId: string, kind: ProductEventKind) {
  const id = productId.trim();
  if (!id) return;

  try {
    void fetch("/api/catalog/product-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: id, kind }),
      keepalive: true,
    });
  } catch {
    /* analytics must not block navigation */
  }
}

async function readProductList(res: Response): Promise<CatalogProductCard[]> {
  if (!res.ok) return [];
  const data: unknown = await res.json();
  if (!data || typeof data !== "object" || !("products" in data)) return [];
  const products = (data as { products: unknown }).products;
  return Array.isArray(products) ? (products as CatalogProductCard[]) : [];
}

export async function fetchRecentlyViewedProducts(ids: string[]): Promise<CatalogProductCard[]> {
  const res = await fetch("/api/catalog/recently-viewed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  return readProductList(res);
}

export async function fetchAffinityProducts(
  ids: string[],
  excludeIds: string[] = [],
): Promise<CatalogProductCard[]> {
  const res = await fetch("/api/catalog/affinity", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids, excludeIds }),
  });
  return readProductList(res);
}
