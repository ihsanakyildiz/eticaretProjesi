import "server-only";

import { Role } from "@prisma/client";
import { auth } from "@/auth";
import { pricedLine } from "@/lib/order-server";
import { prisma } from "@/lib/prisma";
import { publicProductHref } from "@/lib/public-urls";
import { getSettingsMap } from "@/lib/settings";
import { parseUrlStructure } from "@/lib/url-structure";
import { normalizeCartLines, type CartLine } from "@/lib/cart";
import type {
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

export async function hydrateCart(raw: CartLine[]): Promise<HydratedCart> {
  const lines = normalizeCartLines(raw);
  if (lines.length === 0) {
    return { lines: [], productsMinor: 0, taxMinor: 0, extraShippingMinor: 0 };
  }

  const [variants, settings] = await Promise.all([
    prisma.productVariant.findMany({
      where: { id: { in: lines.map((line) => line.variantId) }, isActive: true },
      include: {
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
            extraShippingMinor: true,
          },
        },
      },
    }),
    getSettingsMap().catch(() => ({}) as Record<string, string>),
  ]);
  const urls = parseUrlStructure(settings);
  const byId = new Map(variants.map((row) => [row.id, row]));

  const hydrated: HydratedCartLine[] = [];
  let productsMinor = 0;
  let taxMinor = 0;
  let extraShippingMinor = 0;

  for (const line of lines) {
    const variant = byId.get(line.variantId);
    const product = variant?.product;
    const inStock =
      !variant?.trackInventory || variant.stockQuantity >= line.quantity || variant.allowBackorder;
    const available = Boolean(
      variant &&
        product?.isActive &&
        product.visibility !== "NONE" &&
        product.availableForOrder &&
        inStock,
    );
    if (!variant || !product || !available) continue;

    const priced = pricedLine({
      priceExclMinor: variant.priceMinor,
      taxRatePercent: product.taxRatePercent,
      quantity: line.quantity,
    });
    productsMinor += priced.totalMinor;
    taxMinor += priced.taxMinor;
    extraShippingMinor += product.extraShippingMinor * line.quantity;

    hydrated.push({
      variantId: variant.id,
      productId: product.id,
      title: product.title,
      variantTitle: variant.isDefault ? null : variant.title,
      href: publicProductHref(product.slug, urls, product.urlId),
      sku: variant.sku,
      image: variant.image || product.image,
      quantity: line.quantity,
      unitPriceMinor: priced.unitPriceMinor,
      taxRatePercent: product.taxRatePercent,
      totalMinor: priced.totalMinor,
      extraShippingMinor: product.extraShippingMinor * line.quantity,
      available: true,
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
  const rows = await prisma.shippingCarrier.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, logo: true },
  });
  if (rows.length === 0) {
    return [{ id: "standard", name: "Standart kargo", logo: null, priceMinor: extraShippingMinor }];
  }
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    logo: row.logo,
    priceMinor: extraShippingMinor,
  }));
}
