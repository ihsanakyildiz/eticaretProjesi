import "server-only";

import {
  discountCouponOfferLabel,
  normalizeDiscountCouponCode,
  type DiscountCouponKindCode,
} from "@/lib/discount-coupon-kinds";
import { ensureDiscountCouponSchema } from "@/lib/ensure-discount-coupon-schema";
import { prisma } from "@/lib/prisma";
import type { CategoryNodeBase } from "@/lib/category-tree";
import { collectDescendantIds } from "@/lib/category-tree";

export type CartCouponLineInput = {
  productId: string;
  categoryId: string | null;
  brandId: string | null;
  available: boolean;
  totalMinor: number;
};

export type AppliedCartCoupon = {
  code: string;
  name: string | null;
  offerLabel: string;
  discountMinor: number;
  eligibleProductsMinor: number;
};

function uniqueIds(ids: string[]) {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}

async function expandCategoryIds(categoryIds: string[]) {
  const ids = uniqueIds(categoryIds);
  if (ids.length === 0) return [] as string[];
  const rows = await prisma.productCategory.findMany({
    select: {
      id: true,
      parentId: true,
      name: true,
      slug: true,
      sortOrder: true,
      isActive: true,
    },
  });
  const expanded = new Set<string>();
  for (const id of ids) {
    for (const child of collectDescendantIds(rows as CategoryNodeBase[], id)) {
      expanded.add(child);
    }
  }
  return [...expanded];
}

export function computeCouponDiscountMinor(
  kind: DiscountCouponKindCode,
  valueInt: number,
  eligibleProductsMinor: number,
) {
  if (eligibleProductsMinor <= 0 || valueInt <= 0) return 0;
  switch (kind) {
    case "PERCENT": {
      const percent = Math.min(100, Math.max(0, valueInt));
      return Math.min(
        eligibleProductsMinor,
        Math.round((eligibleProductsMinor * percent) / 100),
      );
    }
    case "FIXED":
      return Math.min(eligibleProductsMinor, Math.max(0, valueInt));
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function lineMatchesScope(
  line: CartCouponLineInput,
  scope: {
    categoryIds: Set<string>;
    brandIds: Set<string>;
    productIds: Set<string>;
    unrestricted: boolean;
  },
) {
  if (scope.unrestricted) return true;
  if (scope.productIds.has(line.productId)) return true;
  if (line.brandId && scope.brandIds.has(line.brandId)) return true;
  if (line.categoryId && scope.categoryIds.has(line.categoryId)) return true;
  return false;
}

export async function resolveCartCoupon(input: {
  code: string | null | undefined;
  lines: CartCouponLineInput[];
  userId?: string | null;
  now?: Date;
}): Promise<
  | { ok: true; coupon: AppliedCartCoupon | null }
  | { ok: false; error: string }
> {
  const code = normalizeDiscountCouponCode(input.code ?? "");
  if (!code) return { ok: true, coupon: null };

  await ensureDiscountCouponSchema().catch(() => undefined);

  const now = input.now ?? new Date();
  const row = await prisma.discountCoupon.findUnique({
    where: { code },
    include: {
      categories: { select: { categoryId: true } },
      brands: { select: { brandId: true } },
      products: { select: { productId: true } },
    },
  });

  if (!row || row.status !== "ACTIVE") {
    return { ok: false, error: "İndirim kodu geçersiz veya pasif." };
  }
  if (row.startsAt && row.startsAt.getTime() > now.getTime()) {
    return { ok: false, error: "Bu indirim kodu henüz başlamadı." };
  }
  if (row.endsAt && row.endsAt.getTime() < now.getTime()) {
    return { ok: false, error: "Bu indirim kodunun süresi dolmuş." };
  }

  switch (row.usageMode) {
    case "UNLIMITED":
      break;
    case "ONCE":
      if (row.redemptionCount >= 1) {
        return { ok: false, error: "Bu indirim kodu daha önce kullanılmış." };
      }
      break;
    case "CUSTOMER": {
      if (!input.userId) {
        return { ok: false, error: "Bu kod için giriş yapmanız gerekir." };
      }
      if (!row.customerId || row.customerId !== input.userId) {
        return { ok: false, error: "Bu indirim kodu hesabınıza özel değil." };
      }
      break;
    }
    default: {
      const _exhaustive: never = row.usageMode;
      return _exhaustive;
    }
  }

  const categoryIds = await expandCategoryIds(row.categories.map((item) => item.categoryId));
  const brandIds = uniqueIds(row.brands.map((item) => item.brandId));
  const productIds = uniqueIds(row.products.map((item) => item.productId));
  const unrestricted =
    categoryIds.length === 0 && brandIds.length === 0 && productIds.length === 0;
  const scope = {
    categoryIds: new Set(categoryIds),
    brandIds: new Set(brandIds),
    productIds: new Set(productIds),
    unrestricted,
  };

  const eligible = input.lines.filter(
    (line) => line.available && line.totalMinor > 0 && lineMatchesScope(line, scope),
  );
  const eligibleProductsMinor = eligible.reduce((sum, line) => sum + line.totalMinor, 0);

  if (eligibleProductsMinor <= 0) {
    return {
      ok: false,
      error: unrestricted
        ? "Sepette indirim uygulanacak ürün yok."
        : "Bu kod seçili ürünlere uygulanmıyor.",
    };
  }

  if (row.minSubtotalMinor > 0 && eligibleProductsMinor < row.minSubtotalMinor) {
    return {
      ok: false,
      error: `Bu kod için minimum sepet tutarı ${(row.minSubtotalMinor / 100).toLocaleString("tr-TR")} TL.`,
    };
  }

  const kind = row.kind as DiscountCouponKindCode;
  const discountMinor = computeCouponDiscountMinor(kind, row.valueInt, eligibleProductsMinor);
  if (discountMinor <= 0) {
    return { ok: false, error: "İndirim tutarı hesaplanamadı." };
  }

  return {
    ok: true,
    coupon: {
      code: row.code,
      name: row.name,
      offerLabel: discountCouponOfferLabel(kind, row.valueInt),
      discountMinor,
      eligibleProductsMinor,
    },
  };
}
