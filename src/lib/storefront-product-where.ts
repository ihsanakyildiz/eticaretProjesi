import type { Prisma } from "@prisma/client";

export const STOREFRONT_LISTING_VISIBILITIES = ["EVERYWHERE", "CATALOG"] as const;

const listingVisibility = STOREFRONT_LISTING_VISIBILITIES;

export function mergeProductWhere(
  base: Prisma.ProductWhereInput,
  extra?: Prisma.ProductWhereInput,
): Prisma.ProductWhereInput {
  if (!extra) return base;
  const extraAnd = extra.AND;
  const extraRest = { ...extra };
  delete extraRest.AND;
  const and: Prisma.ProductWhereInput[] = [];
  if (base.AND) {
    and.push(...(Array.isArray(base.AND) ? base.AND : [base.AND]));
  }
  if (extraAnd) {
    and.push(...(Array.isArray(extraAnd) ? extraAnd : [extraAnd]));
  }
  const baseRest = { ...base };
  delete baseRest.AND;
  return {
    ...baseRest,
    ...extraRest,
    ...(and.length > 0 ? { AND: and } : {}),
  };
}

export function storefrontSellableWhere(extra?: Prisma.ProductWhereInput): Prisma.ProductWhereInput {
  return mergeProductWhere(
    {
      isActive: true,
      availableForOrder: true,
    },
    extra,
  );
}

export function storefrontListingWhere(extra?: Prisma.ProductWhereInput): Prisma.ProductWhereInput {
  return storefrontSellableWhere({
    visibility: { in: [...listingVisibility] },
    ...extra,
  });
}

export function storefrontPublicProductWhere(
  extra?: Prisma.ProductWhereInput,
): Prisma.ProductWhereInput {
  return storefrontSellableWhere({
    visibility: { not: "NONE" },
    ...extra,
  });
}
