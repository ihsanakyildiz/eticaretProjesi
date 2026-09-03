import "server-only";

import { codesMatch, normalizeScanCode } from "@/lib/warehouse";
import { prisma } from "@/lib/prisma";

export type InventoryScanVariant = {
  id: string;
  sku: string;
  barcode: string | null;
  title: string;
  productTitle: string;
  image: string | null;
};

export type FindVariantByScanResult =
  | { ok: true; variant: InventoryScanVariant }
  | { ok: false; error: string };

export async function findVariantByScan(code: string): Promise<FindVariantByScanResult> {
  const scanned = normalizeScanCode(code);
  if (!scanned) return { ok: false, error: "Barkod okunamadı." };

  const candidates = await prisma.productVariant.findMany({
    where: {
      isActive: true,
      OR: [{ barcode: scanned }, { sku: scanned }],
    },
    take: 20,
    select: {
      id: true,
      sku: true,
      barcode: true,
      title: true,
      image: true,
      product: {
        select: {
          title: true,
          image: true,
          images: {
            orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }],
            take: 1,
            select: { url: true },
          },
        },
      },
    },
  });

  const barcodeHits = candidates.filter((row) => codesMatch(scanned, row.barcode));
  if (barcodeHits.length > 1) {
    return {
      ok: false,
      error:
        "Bu barkod birden fazla varyantta kayıtlı. Katalogdaki tekrarlayan barkodları düzeltmeden stok girişi yapılamaz.",
    };
  }

  const skuHits = candidates.filter((row) => codesMatch(scanned, row.sku));
  const match = barcodeHits[0] ?? (skuHits.length === 1 ? skuHits[0] : null);
  if (!match) {
    if (skuHits.length > 1) {
      return { ok: false, error: "Bu SKU birden fazla kayda denk geliyor." };
    }
    return { ok: false, error: "Okutulan barkod katalogda bulunamadı." };
  }

  return {
    ok: true,
    variant: {
      id: match.id,
      sku: match.sku,
      barcode: match.barcode,
      title: match.title,
      productTitle: match.product.title,
      image: match.image ?? match.product.image ?? match.product.images[0]?.url ?? null,
    },
  };
}
