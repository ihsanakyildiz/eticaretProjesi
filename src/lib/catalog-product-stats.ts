import "server-only";

import { prisma } from "@/lib/prisma";

export type ProductEventKind = "click" | "view";

const PRODUCT_ID_RE = /^[a-zA-Z0-9_-]{1,191}$/;

export function isProductEventKind(value: unknown): value is ProductEventKind {
  return value === "click" || value === "view";
}

export function normalizeProductId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return PRODUCT_ID_RE.test(id) ? id : null;
}

export async function incrementProductStat(productId: string, kind: ProductEventKind) {
  const id = normalizeProductId(productId);
  if (!id) return;

  switch (kind) {
    case "click":
      await prisma.product
        .update({
          where: { id },
          data: { clickCount: { increment: 1 } },
        })
        .catch(() => undefined);
      return;
    case "view":
      await prisma.product
        .update({
          where: { id },
          data: { viewCount: { increment: 1 } },
        })
        .catch(() => undefined);
      return;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}
