import { NextResponse } from "next/server";
import {
  incrementProductStat,
  isProductEventKind,
  normalizeProductId,
} from "@/lib/catalog-product-stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  if (!body || typeof body !== "object") {
    return new NextResponse(null, { status: 204 });
  }

  const record = body as { productId?: unknown; kind?: unknown };
  const productId = normalizeProductId(record.productId);
  if (!productId || !isProductEventKind(record.kind)) {
    return new NextResponse(null, { status: 204 });
  }

  await incrementProductStat(productId, record.kind);
  return new NextResponse(null, { status: 204 });
}
