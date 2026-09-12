import "server-only";

import { Prisma } from "@prisma/client";
import { campaignOfferLabel, isCampaignKind } from "@/lib/campaign-kinds";
import type { CampaignStatsDetail, CampaignStatsSummary } from "@/lib/campaign-stats-types";
import { ensureOrderDiscountSchema } from "@/lib/ensure-order-discount-schema";
import { ensureStorefrontCartSchema } from "@/lib/ensure-storefront-cart-schema";
import { prisma } from "@/lib/prisma";

export type {
  CampaignStatsCartProduct,
  CampaignStatsDetail,
  CampaignStatsPoint,
  CampaignStatsProduct,
  CampaignStatsSummary,
} from "@/lib/campaign-stats-types";

const PAID_SQL = Prisma.sql`'PAYMENT_ACCEPTED', 'PROCESSING', 'SHIPPED', 'DELIVERED'`;

function asInt(value: bigint | number | null | undefined) {
  return Number(value ?? 0);
}

export async function loadCampaignStatsSummaries(
  campaignIds: string[],
): Promise<Map<string, CampaignStatsSummary>> {
  const map = new Map<string, CampaignStatsSummary>();
  if (campaignIds.length === 0) return map;
  for (const id of campaignIds) {
    map.set(id, {
      campaignId: id,
      revenueMinor: 0,
      unitsSold: 0,
      orderCount: 0,
      cartUnits: 0,
    });
  }

  const ids = Prisma.join(campaignIds);
  await ensureStorefrontCartSchema().catch(() => undefined);

  const [sales, carts] = await Promise.all([
    prisma.$queryRaw<
      Array<{
        campaignId: string;
        revenueMinor: bigint | number | null;
        unitsSold: bigint | number | null;
        orderCount: bigint | number | null;
      }>
    >`
      SELECT
        c.id AS campaignId,
        COALESCE(SUM(CASE WHEN o.status IN (${PAID_SQL}) THEN oi.totalMinor ELSE 0 END), 0) AS revenueMinor,
        COALESCE(SUM(CASE WHEN o.status IN (${PAID_SQL}) THEN oi.quantity ELSE 0 END), 0) AS unitsSold,
        COUNT(DISTINCT CASE WHEN o.status IN (${PAID_SQL}) THEN o.id END) AS orderCount
      FROM campaigns c
      LEFT JOIN campaign_products cp ON cp.campaignId = c.id
      LEFT JOIN order_items oi ON oi.productId = cp.productId
      LEFT JOIN orders o ON o.id = oi.orderId
        AND o.createdAt >= COALESCE(c.startsAt, c.createdAt)
        AND o.createdAt <= COALESCE(c.endsAt, NOW())
      WHERE c.id IN (${ids})
      GROUP BY c.id
    `.catch(() => []),
    prisma.$queryRaw<
      Array<{
        campaignId: string;
        cartUnits: bigint | number | null;
      }>
    >`
      SELECT
        cp.campaignId,
        COALESCE(SUM(cl.quantity), 0) AS cartUnits
      FROM campaign_products cp
      INNER JOIN storefront_cart_lines cl ON cl.productId = cp.productId
      WHERE cp.campaignId IN (${ids})
        AND cp.restoredAt IS NULL
        AND cl.updatedAt >= DATE_SUB(NOW(), INTERVAL 48 HOUR)
      GROUP BY cp.campaignId
    `.catch(() => []),
  ]);

  for (const row of sales) {
    const current = map.get(row.campaignId);
    if (!current) continue;
    current.revenueMinor = asInt(row.revenueMinor);
    current.unitsSold = asInt(row.unitsSold);
    current.orderCount = asInt(row.orderCount);
  }
  for (const row of carts) {
    const current = map.get(row.campaignId);
    if (current) current.cartUnits = asInt(row.cartUnits);
  }
  return map;
}

export async function loadCampaignStatsDetail(
  campaignId: string,
): Promise<CampaignStatsDetail | null> {
  const id = campaignId.trim();
  if (!id) return null;
  await Promise.all([
    ensureStorefrontCartSchema().catch(() => undefined),
    ensureOrderDiscountSchema().catch(() => undefined),
  ]);

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      kind: true,
      valueInt: true,
      startsAt: true,
      endsAt: true,
      createdAt: true,
      _count: { select: { products: true } },
    },
  });
  if (!campaign) return null;

  const [sales, pending, cart, dailyRows, topRows, cartProductRows] = await Promise.all([
    prisma.$queryRaw<
      Array<{
        revenueMinor: bigint | number | null;
        unitsSold: bigint | number | null;
        orderCount: bigint | number | null;
        uniqueProducts: bigint | number | null;
        discountMinor: bigint | number | null;
      }>
    >`
      SELECT
        COALESCE(SUM(oi.totalMinor), 0) AS revenueMinor,
        COALESCE(SUM(oi.quantity), 0) AS unitsSold,
        COUNT(DISTINCT o.id) AS orderCount,
        COUNT(DISTINCT oi.productId) AS uniqueProducts,
        COALESCE(SUM(
          CASE
            WHEN oi.compareAtMinor IS NOT NULL AND oi.compareAtMinor > oi.unitPriceMinor
              THEN (oi.compareAtMinor - oi.unitPriceMinor) * oi.quantity
            WHEN c.kind IN ('PERCENT_OFF', 'CART_PERCENT') AND c.valueInt > 0 AND c.valueInt < 100
              THEN ROUND(oi.totalMinor * c.valueInt / (100.0 - c.valueInt))
            WHEN c.kind = 'FIXED_OFF' AND c.valueInt > 0
              THEN LEAST(c.valueInt, oi.unitPriceMinor) * oi.quantity
            ELSE 0
          END
        ), 0) AS discountMinor
      FROM campaign_products cp
      INNER JOIN order_items oi ON oi.productId = cp.productId
      INNER JOIN orders o ON o.id = oi.orderId
      INNER JOIN campaigns c ON c.id = cp.campaignId
      WHERE cp.campaignId = ${id}
        AND o.status IN (${PAID_SQL})
        AND o.createdAt >= COALESCE(c.startsAt, c.createdAt)
        AND o.createdAt <= COALESCE(c.endsAt, NOW())
    `.catch(() => []),
    prisma.$queryRaw<
      Array<{
        pendingOrderCount: bigint | number | null;
        pendingUnits: bigint | number | null;
        pendingMinor: bigint | number | null;
      }>
    >`
      SELECT
        COUNT(DISTINCT o.id) AS pendingOrderCount,
        COALESCE(SUM(oi.quantity), 0) AS pendingUnits,
        COALESCE(SUM(oi.totalMinor), 0) AS pendingMinor
      FROM campaign_products cp
      INNER JOIN order_items oi ON oi.productId = cp.productId
      INNER JOIN orders o ON o.id = oi.orderId
      INNER JOIN campaigns c ON c.id = cp.campaignId
      WHERE cp.campaignId = ${id}
        AND o.status = 'AWAITING_PAYMENT'
        AND o.createdAt >= COALESCE(c.startsAt, c.createdAt)
        AND o.createdAt <= COALESCE(c.endsAt, NOW())
    `.catch(() => []),
    prisma.$queryRaw<
      Array<{
        cartUnits: bigint | number | null;
        cartSessions: bigint | number | null;
        cartValueMinor: bigint | number | null;
      }>
    >`
      SELECT
        COALESCE(SUM(cl.quantity), 0) AS cartUnits,
        COUNT(DISTINCT cl.sessionKey) AS cartSessions,
        COALESCE(SUM(cl.quantity * cl.unitPriceMinor), 0) AS cartValueMinor
      FROM campaign_products cp
      INNER JOIN storefront_cart_lines cl ON cl.productId = cp.productId
      WHERE cp.campaignId = ${id}
        AND cp.restoredAt IS NULL
        AND cl.updatedAt >= DATE_SUB(NOW(), INTERVAL 48 HOUR)
    `.catch(() => []),
    prisma.$queryRaw<
      Array<{
        day: Date | string;
        revenueMinor: bigint | number | null;
        units: bigint | number | null;
      }>
    >`
      SELECT
        DATE(o.createdAt) AS day,
        COALESCE(SUM(oi.totalMinor), 0) AS revenueMinor,
        COALESCE(SUM(oi.quantity), 0) AS units
      FROM campaign_products cp
      INNER JOIN order_items oi ON oi.productId = cp.productId
      INNER JOIN orders o ON o.id = oi.orderId
      INNER JOIN campaigns c ON c.id = cp.campaignId
      WHERE cp.campaignId = ${id}
        AND o.status IN (${PAID_SQL})
        AND o.createdAt >= COALESCE(c.startsAt, c.createdAt)
        AND o.createdAt <= COALESCE(c.endsAt, NOW())
      GROUP BY DATE(o.createdAt)
      ORDER BY day ASC
    `.catch(() => []),
    prisma.$queryRaw<
      Array<{
        id: string;
        title: string;
        image: string | null;
        quantity: bigint | number | null;
        revenueMinor: bigint | number | null;
      }>
    >`
      SELECT
        p.id,
        p.title,
        p.image,
        COALESCE(SUM(oi.quantity), 0) AS quantity,
        COALESCE(SUM(oi.totalMinor), 0) AS revenueMinor
      FROM campaign_products cp
      INNER JOIN order_items oi ON oi.productId = cp.productId
      INNER JOIN orders o ON o.id = oi.orderId
      INNER JOIN campaigns c ON c.id = cp.campaignId
      INNER JOIN products p ON p.id = oi.productId
      WHERE cp.campaignId = ${id}
        AND o.status IN (${PAID_SQL})
        AND o.createdAt >= COALESCE(c.startsAt, c.createdAt)
        AND o.createdAt <= COALESCE(c.endsAt, NOW())
      GROUP BY p.id, p.title, p.image
      ORDER BY revenueMinor DESC
      LIMIT 8
    `.catch(() => []),
    prisma.$queryRaw<
      Array<{
        id: string;
        variantId: string | null;
        title: string;
        variantTitle: string | null;
        isDefault: number | boolean | null;
        image: string | null;
        quantity: bigint | number | null;
        sessions: bigint | number | null;
        valueMinor: bigint | number | null;
        lastUpdatedAt: Date | string | null;
      }>
    >`
      SELECT
        p.id,
        cl.variantId,
        p.title,
        v.title AS variantTitle,
        v.isDefault,
        COALESCE(NULLIF(v.image, ''), p.image) AS image,
        COALESCE(SUM(cl.quantity), 0) AS quantity,
        COUNT(DISTINCT cl.sessionKey) AS sessions,
        COALESCE(SUM(cl.quantity * cl.unitPriceMinor), 0) AS valueMinor,
        MAX(cl.updatedAt) AS lastUpdatedAt
      FROM campaign_products cp
      INNER JOIN storefront_cart_lines cl ON cl.productId = cp.productId
      INNER JOIN products p ON p.id = cl.productId
      LEFT JOIN product_variants v ON v.id = cl.variantId
      WHERE cp.campaignId = ${id}
        AND cp.restoredAt IS NULL
        AND cl.updatedAt >= DATE_SUB(NOW(), INTERVAL 48 HOUR)
      GROUP BY p.id, cl.variantId, p.title, v.title, v.isDefault, v.image, p.image
      ORDER BY quantity DESC, valueMinor DESC
      LIMIT 50
    `.catch(() => []),
  ]);

  const sale = sales[0];
  const wait = pending[0];
  const cartRow = cart[0];
  const revenueMinor = asInt(sale?.revenueMinor);
  const orderCount = asInt(sale?.orderCount);

  return {
    campaignId: campaign.id,
    name: campaign.name,
    offerLabel: isCampaignKind(campaign.kind)
      ? campaignOfferLabel(campaign.kind, campaign.valueInt)
      : campaign.name,
    startsAt: campaign.startsAt?.toISOString() ?? campaign.createdAt.toISOString(),
    endsAt: campaign.endsAt?.toISOString() ?? null,
    productCount: campaign._count.products,
    revenueMinor,
    unitsSold: asInt(sale?.unitsSold),
    orderCount,
    uniqueProductsSold: asInt(sale?.uniqueProducts),
    discountMinor: asInt(sale?.discountMinor),
    averageOrderMinor: orderCount > 0 ? Math.round(revenueMinor / orderCount) : 0,
    pendingOrderCount: asInt(wait?.pendingOrderCount),
    pendingUnits: asInt(wait?.pendingUnits),
    pendingMinor: asInt(wait?.pendingMinor),
    cartUnits: asInt(cartRow?.cartUnits),
    cartSessions: asInt(cartRow?.cartSessions),
    cartValueMinor: asInt(cartRow?.cartValueMinor),
    daily: dailyRows.map((row) => {
      const date = row.day instanceof Date ? row.day : new Date(row.day);
      return {
        label: date.toLocaleDateString("tr-TR", { day: "numeric", month: "short" }),
        fullLabel: date.toLocaleDateString("tr-TR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        revenueMinor: asInt(row.revenueMinor),
        units: asInt(row.units),
      };
    }),
    topProducts: topRows.map((row) => ({
      id: row.id,
      title: row.title,
      image: row.image,
      quantity: asInt(row.quantity),
      revenueMinor: asInt(row.revenueMinor),
    })),
    cartProducts: cartProductRows.map((row) => {
      const defaultVariant = row.isDefault === true || row.isDefault === 1;
      const variantTitle = row.variantTitle?.trim() || null;
      const lastUpdatedAt =
        row.lastUpdatedAt instanceof Date
          ? row.lastUpdatedAt.toISOString()
          : row.lastUpdatedAt
            ? new Date(row.lastUpdatedAt).toISOString()
            : null;
      return {
        id: row.id,
        variantId: row.variantId,
        title: row.title,
        variantTitle: defaultVariant ? null : variantTitle,
        image: row.image,
        quantity: asInt(row.quantity),
        sessions: asInt(row.sessions),
        valueMinor: asInt(row.valueMinor),
        lastUpdatedAt,
      };
    }),
  };
}
