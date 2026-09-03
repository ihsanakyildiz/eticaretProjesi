import { NextResponse } from "next/server";
import { getCatalogProductsByIds } from "@/lib/catalog-products";
import { normalizeProductId } from "@/lib/catalog-product-stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ products: [] });
  }

  const idsRaw =
    body && typeof body === "object" && "ids" in body ? (body as { ids: unknown }).ids : [];
  const ids = Array.isArray(idsRaw)
    ? idsRaw.map(normalizeProductId).filter((id): id is string => Boolean(id))
    : [];

  const products = await getCatalogProductsByIds(ids);
  return NextResponse.json({ products });
}
