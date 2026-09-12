import { NextResponse } from "next/server";
import { getAffinityCatalogProducts } from "@/lib/catalog-products";
import { normalizeProductId } from "@/lib/catalog-product-stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeProductId).filter((id): id is string => Boolean(id));
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ products: [] });
  }

  const seedIds =
    body && typeof body === "object" && "ids" in body
      ? readIds((body as { ids: unknown }).ids)
      : [];
  const excludeIds =
    body && typeof body === "object" && "excludeIds" in body
      ? readIds((body as { excludeIds: unknown }).excludeIds)
      : [];

  const products = await getAffinityCatalogProducts(seedIds, excludeIds, 8);
  return NextResponse.json({ products });
}
