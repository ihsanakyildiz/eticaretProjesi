import "server-only";

import { ProductEstimatedDelivery, Role } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { auth } from "@/auth";
import { pricedLine } from "@/lib/order-server";
import { checkoutDataCacheSeconds, parsePerformance, withCdnUrl } from "@/lib/performance";
import { taxIncludedMinor } from "@/lib/product-money";
import { applyCartPercentMinor } from "@/lib/campaign-kinds";
import { loadLiveCampaignsByProductIds } from "@/lib/campaigns";
import { resolveSalePrice } from "@/lib/product-sale";
import { prisma } from "@/lib/prisma";
import { publicProductHref } from "@/lib/public-urls";
import { getSettingsMap } from "@/lib/settings";
import { parseUrlStructure } from "@/lib/url-structure";
import { normalizeCartLines, type CartLine } from "@/lib/cart";
import { allowsOrderWhenOutOfStock, isVariantPurchasable } from "@/lib/product-stock";
import type {
  CartDeliveryCode,
  CartLineIssueCode,
  CheckoutAddress,
  CheckoutCarrier,
  HydratedCart,
  HydratedCartLine,
} from "@/lib/checkout-types";

export type {
  CheckoutAddress,
  CheckoutCarrier,
  HydratedCart,
  HydratedCartLine,
} from "@/lib/checkout-types";

export const CHECKOUT_CACHE_TAG = "checkout";

const cartVariantSelect = {
  id: true,
  title: true,
  sku: true,
  image: true,
  priceMinor: true,
  compareAtMinor: true,
  saleStartsAt: true,
  saleEndsAt: true,
  stockQuantity: true,
  trackInventory: true,
  allowBackorder: true,
  isDefault: true,
  isActive: true,
  product: {
    select: {
      id: true,
      title: true,
      slug: true,
      urlId: true,
      image: true,
      taxRatePercent: true,
      isActive: true,
      visibility: true,
      availableForOrder: true,
      outOfStockBehavior: true,
      extraShippingMinor: true,
      compareAtMinor: true,
      saleStartsAt: true,
      saleEndsAt: true,
      minOrderQty: true,
      quantityStep: true,
      estimatedDelivery: true,
      brand: { select: { name: true } },
    },
  },
} as const;

async function loadCartVariants(ids: string[]) {
  if (ids.length === 0) return [];
  return prisma.productVariant.findMany({
    where: { id: { in: ids } },
    select: cartVariantSelect,
  });
}

async function loadActiveCarriers() {
  return prisma.shippingCarrier.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, logo: true },
  });
}

export async function requireCheckoutUser() {
  const session = await auth();
  const role = session?.user?.role;
  if (
    !session?.user?.id ||
    (role !== Role.MEMBER && role !== Role.ADMIN && role !== Role.STAFF)
  ) {
    return null;
  }
  return session;
}

function toCartDelivery(value: ProductEstimatedDelivery | null): CartDeliveryCode | null {
  switch (value) {
    case ProductEstimatedDelivery.SAME_DAY:
      return "SAME_DAY";
    case ProductEstimatedDelivery.DAYS_1_3:
      return "DAYS_1_3";
    case ProductEstimatedDelivery.DAYS_3_5:
      return "DAYS_3_5";
    case ProductEstimatedDelivery.DAYS_5_10:
      return "DAYS_5_10";
    case null:
      return null;
    default: {
      const _exhaustive: never = value;
      return _exhaustive;
    }
  }
}

function classifyCartLine(input: {
  variant: { isActive: boolean; priceMinor: number } | null;
  product: {
    isActive: boolean;
    visibility: string;
    availableForOrder: boolean;
  } | null;
  inStock: boolean;
}): CartLineIssueCode | null {
  if (!input.variant || !input.product) return "MISSING";
  if (!input.variant.isActive) return "INACTIVE_VARIANT";
  if (!input.product.isActive) return "INACTIVE_PRODUCT";
  if (input.product.visibility === "NONE") return "HIDDEN";
  if (!input.product.availableForOrder) return "NOT_FOR_SALE";
  if (input.variant.priceMinor <= 0) return "NO_PRICE";
  if (!input.inStock) return "OUT_OF_STOCK";
  return null;
}

export async function hydrateCart(raw: CartLine[]): Promise<HydratedCart> {
  const lines = normalizeCartLines(raw);
  if (lines.length === 0) {
    return { lines: [], productsMinor: 0, taxMinor: 0, extraShippingMinor: 0 };
  }

  const settings = await getSettingsMap().catch(() => ({}) as Record<string, string>);
  const perf = parsePerformance(settings);
  const urls = parseUrlStructure(settings);
  const ids = [...new Set(lines.map((line) => line.variantId))];
  const variants = await loadCartVariants(ids);
  const byId = new Map(variants.map((row) => [row.id, row]));
  const campaigns = await loadLiveCampaignsByProductIds(
    variants.map((row) => row.product.id),
  );

  const hydrated: HydratedCartLine[] = [];
  let productsMinor = 0;
  let taxMinor = 0;
  let extraShippingMinor = 0;

  for (const line of lines) {
    const variant = byId.get(line.variantId) ?? null;
    const product = variant?.product ?? null;
    const requestedQuantity = line.quantity;
    let quantity = requestedQuantity;
    let qtyAdjustedFrom: number | null = null;

    if (variant && product) {
      const minQty = Math.max(1, product.minOrderQty);
      if (quantity < minQty) {
        qtyAdjustedFrom = requestedQuantity;
        quantity = minQty;
      }
      const denyOos = !allowsOrderWhenOutOfStock(product.outOfStockBehavior, variant.allowBackorder);
      if (variant.trackInventory && denyOos && variant.stockQuantity > 0 && quantity > variant.stockQuantity) {
        qtyAdjustedFrom = qtyAdjustedFrom ?? requestedQuantity;
        quantity = variant.stockQuantity;
      }
    }

    const inStock = Boolean(
      variant &&
        product &&
        isVariantPurchasable({
          trackInventory: variant.trackInventory,
          stockQuantity: variant.stockQuantity,
          neededQuantity: quantity,
          allowBackorder: variant.allowBackorder,
          outOfStockBehavior: product.outOfStockBehavior,
        }),
    );
    const issue = classifyCartLine({ variant, product, inStock });
    const available = issue == null;

    const taxRatePercent = product?.taxRatePercent ?? 0;
    const resolved = variant
      ? resolveSalePrice({
          priceMinor: variant.priceMinor,
          compareAtMinor: variant.compareAtMinor ?? product?.compareAtMinor ?? null,
          saleStartsAt: variant.saleStartsAt ?? product?.saleStartsAt,
          saleEndsAt: variant.saleEndsAt ?? product?.saleEndsAt,
        })
      : null;
    const campaign = product ? campaigns.get(product.id) ?? null : null;
    let chargeExcl = resolved?.priceMinor ?? variant?.priceMinor ?? 0;
    let compareAtExcl = resolved?.compareAtMinor ?? null;
    if (campaign?.kind === "CART_PERCENT" && chargeExcl > 0) {
      const before = chargeExcl;
      chargeExcl = applyCartPercentMinor(chargeExcl, campaign.valueInt);
      if (compareAtExcl == null || compareAtExcl <= chargeExcl) compareAtExcl = before;
    }
    const lineExtraShipping =
      available && campaign?.kind !== "FREE_SHIPPING"
        ? (product?.extraShippingMinor ?? 0) * quantity
        : 0;
    const priced =
      variant && chargeExcl > 0
        ? pricedLine({
            priceExclMinor: chargeExcl,
            taxRatePercent,
            quantity,
          })
        : {
            unitPriceMinor: line.unitPriceMinor ?? 0,
            totalMinor: 0,
            taxMinor: 0,
          };

    const snapshot = line.unitPriceMinor;
    const priceChange =
      available &&
      snapshot != null &&
      snapshot > 0 &&
      priced.unitPriceMinor > 0 &&
      snapshot !== priced.unitPriceMinor
        ? { fromMinor: snapshot, toMinor: priced.unitPriceMinor }
        : null;

    if (available) {
      productsMinor += priced.totalMinor;
      taxMinor += priced.taxMinor;
      extraShippingMinor += lineExtraShipping;
    }
    const compareAtMinor =
      compareAtExcl != null && compareAtExcl > 0
        ? taxIncludedMinor(compareAtExcl, taxRatePercent)
        : null;
    const savingsMinor =
      available && compareAtMinor && compareAtMinor > priced.unitPriceMinor
        ? (compareAtMinor - priced.unitPriceMinor) * quantity
        : 0;
    const maxQuantity =
      variant &&
      product &&
      variant.trackInventory &&
      !allowsOrderWhenOutOfStock(product.outOfStockBehavior, variant.allowBackorder)
        ? Math.max(0, variant.stockQuantity)
        : null;

    hydrated.push({
      lineKey: line.lineKey,
      variantId: line.variantId,
      productId: product?.id ?? "",
      title: product?.title ?? "Ürün artık satışta değil",
      brandName: product?.brand?.name ?? null,
      variantTitle: variant && !variant.isDefault ? variant.title : null,
      href: product ? publicProductHref(product.slug, urls, product.urlId) : "/sepet",
      sku: variant?.sku ?? null,
      image: withCdnUrl(variant?.image || product?.image || null, perf.cdnUrl),
      quantity,
      unitPriceMinor: priced.unitPriceMinor,
      compareAtMinor,
      savingsMinor,
      taxRatePercent,
      totalMinor: available ? priced.totalMinor : 0,
      extraShippingMinor: lineExtraShipping,
      maxQuantity,
      minOrderQty: Math.max(1, product?.minOrderQty ?? 1),
      quantityStep: Math.max(1, product?.quantityStep ?? 1),
      estimatedDelivery: toCartDelivery(product?.estimatedDelivery ?? null),
      available,
      issue,
      priceChange,
      qtyAdjustedFrom,
      personalization: line.personalization,
    });
  }

  return { lines: hydrated, productsMinor, taxMinor, extraShippingMinor };
}

export async function loadCheckoutAddresses(userId: string): Promise<CheckoutAddress[]> {
  return prisma.customerAddress.findMany({
    where: { userId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      alias: true,
      firstName: true,
      lastName: true,
      company: true,
      taxOffice: true,
      taxNumber: true,
      phone: true,
      line1: true,
      line2: true,
      district: true,
      city: true,
      neighborhood: true,
      postalCode: true,
      country: true,
      isDelivery: true,
      isInvoice: true,
      isDefaultDelivery: true,
      isDefaultInvoice: true,
      isCorporateInvoice: true,
    },
  });
}

export async function loadCheckoutCarriers(extraShippingMinor: number): Promise<CheckoutCarrier[]> {
  const settings = await getSettingsMap().catch(() => ({}) as Record<string, string>);
  const perf = parsePerformance(settings);
  const ttl = checkoutDataCacheSeconds(perf);
  const rows =
    ttl <= 0
      ? await loadActiveCarriers()
      : await unstable_cache(
          () => loadActiveCarriers(),
          ["checkout-carriers-v1"],
          { tags: [CHECKOUT_CACHE_TAG], revalidate: ttl },
        )();
  if (rows.length === 0) {
    return [{ id: "standard", name: "Standart kargo", logo: null, priceMinor: extraShippingMinor }];
  }
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    logo: withCdnUrl(row.logo, perf.cdnUrl),
    priceMinor: extraShippingMinor,
  }));
}
