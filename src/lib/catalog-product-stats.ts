import "server-only";

import { ensureRankingSchema } from "@/lib/ensure-ranking-schema";
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

async function incrementWithRank(productId: string, kind: ProductEventKind) {
  await ensureRankingSchema().catch(() => undefined);
  switch (kind) {
    case "click":
      await prisma.$executeRaw`
        UPDATE \`products\`
        SET
          \`clickCount\` = \`clickCount\` + 1,
          \`rankScore\` = COALESCE(\`boostScore\`, 0) * 1000
            + FLOOR(LN(1 + \`clickCount\` + 1) * 80 + LN(1 + \`viewCount\`) * 20)
        WHERE \`id\` = ${productId}
      `;
      return;
    case "view":
      await prisma.$executeRaw`
        UPDATE \`products\`
        SET
          \`viewCount\` = \`viewCount\` + 1,
          \`rankScore\` = COALESCE(\`boostScore\`, 0) * 1000
            + FLOOR(LN(1 + \`clickCount\`) * 80 + LN(1 + \`viewCount\` + 1) * 20)
        WHERE \`id\` = ${productId}
      `;
      return;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export async function incrementProductStat(productId: string, kind: ProductEventKind) {
  const id = normalizeProductId(productId);
  if (!id) return;

  try {
    await incrementWithRank(id, kind);
  } catch {
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
}
