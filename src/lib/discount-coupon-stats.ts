import "server-only";

import { normalizeDiscountCouponCode } from "@/lib/discount-coupon-kinds";
import { joinFullName, splitFullName } from "@/lib/customers";
import { ensureDiscountCouponSchema } from "@/lib/ensure-discount-coupon-schema";
import { ensureOrderCouponSchema } from "@/lib/ensure-order-coupon-schema";
import { ensureStorefrontCartSchema } from "@/lib/ensure-storefront-cart-schema";
import { prisma } from "@/lib/prisma";

export type DiscountCouponStatsSummary = {
  couponId: string;
  usageCount: number;
};

export type DiscountCouponStatsCustomer = {
  id: string;
  label: string;
  email: string;
  orderCount: number;
  orderTotalMinor: number;
  couponDiscountMinor: number;
};

export type DiscountCouponStatsOrder = {
  id: string;
  orderNo: number;
  reference: string;
  customerId: string;
  customerName: string;
  status: string;
  productsMinor: number;
  couponDiscountMinor: number;
  totalMinor: number;
  createdAt: string;
};

export type DiscountCouponStatsDetail = {
  id: string;
  code: string;
  name: string | null;
  usageCount: number;
  orderCount: number;
  productsTotalMinor: number;
  orderTotalMinor: number;
  couponDiscountTotalMinor: number;
  pendingCartSessions: number;
  pendingCartProductsMinor: number;
  customers: DiscountCouponStatsCustomer[];
  orders: DiscountCouponStatsOrder[];
};

function asInt(value: bigint | number | null | undefined) {
  return Number(value ?? 0);
}

function customerLabel(row: {
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
  customerNo: number;
}) {
  const fromParts = joinFullName(row.firstName ?? "", row.lastName ?? "");
  const fromName = row.name?.trim() || null;
  const display = fromParts || fromName || splitFullName(row.name).firstName || row.email;
  return `#${row.customerNo} · ${display}`;
}

export async function loadDiscountCouponStatsSummaries(
  couponIds: string[],
): Promise<Map<string, DiscountCouponStatsSummary>> {
  const map = new Map<string, DiscountCouponStatsSummary>();
  for (const id of couponIds) {
    map.set(id, { couponId: id, usageCount: 0 });
  }
  if (couponIds.length === 0) return map;

  await ensureDiscountCouponSchema().catch(() => undefined);
  await ensureOrderCouponSchema().catch(() => undefined);

  const coupons = await prisma.discountCoupon.findMany({
    where: { id: { in: couponIds } },
    select: { id: true, code: true, redemptionCount: true },
  });
  const codes = coupons.map((row) => row.code);
  if (codes.length === 0) return map;

  const orderCounts = await prisma.order.groupBy({
    by: ["couponCode"],
    where: { couponCode: { in: codes } },
    _count: { _all: true },
  });
  const countByCode = new Map(
    orderCounts.map((row) => [row.couponCode ?? "", row._count._all]),
  );

  for (const coupon of coupons) {
    const fromOrders = countByCode.get(coupon.code) ?? 0;
    map.set(coupon.id, {
      couponId: coupon.id,
      usageCount: Math.max(fromOrders, coupon.redemptionCount),
    });
  }
  return map;
}

export async function loadDiscountCouponStatsDetail(
  couponId: string,
): Promise<DiscountCouponStatsDetail | null> {
  const id = String(couponId ?? "").trim();
  if (!id) return null;

  await Promise.all([
    ensureDiscountCouponSchema().catch(() => undefined),
    ensureOrderCouponSchema().catch(() => undefined),
    ensureStorefrontCartSchema().catch(() => undefined),
  ]);

  const coupon = await prisma.discountCoupon.findUnique({
    where: { id },
    select: { id: true, code: true, name: true, redemptionCount: true },
  });
  if (!coupon) return null;

  const code = normalizeDiscountCouponCode(coupon.code);

  const [orders, cartRows] = await Promise.all([
    prisma.order.findMany({
      where: { couponCode: code },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        orderNo: true,
        reference: true,
        status: true,
        productsMinor: true,
        couponDiscountMinor: true,
        totalMinor: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            customerNo: true,
            name: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    }),
    prisma.$queryRaw<
      Array<{
        sessionKey: string;
        productsMinor: bigint | number | null;
      }>
    >`
      SELECT
        cl.sessionKey,
        COALESCE(SUM(cl.unitPriceMinor * cl.quantity), 0) AS productsMinor
      FROM storefront_cart_lines cl
      WHERE cl.couponCode = ${code}
        AND cl.updatedAt >= DATE_SUB(NOW(), INTERVAL 48 HOUR)
      GROUP BY cl.sessionKey
    `.catch(() => []),
  ]);

  const customerMap = new Map<string, DiscountCouponStatsCustomer>();
  let productsTotalMinor = 0;
  let orderTotalMinor = 0;
  let couponDiscountTotalMinor = 0;

  const orderRows: DiscountCouponStatsOrder[] = orders.map((order) => {
    productsTotalMinor += order.productsMinor;
    orderTotalMinor += order.totalMinor;
    couponDiscountTotalMinor += order.couponDiscountMinor;
    const label = customerLabel(order.user);
    const current = customerMap.get(order.user.id);
    if (current) {
      current.orderCount += 1;
      current.orderTotalMinor += order.totalMinor;
      current.couponDiscountMinor += order.couponDiscountMinor;
    } else {
      customerMap.set(order.user.id, {
        id: order.user.id,
        label,
        email: order.user.email,
        orderCount: 1,
        orderTotalMinor: order.totalMinor,
        couponDiscountMinor: order.couponDiscountMinor,
      });
    }
    return {
      id: order.id,
      orderNo: order.orderNo,
      reference: order.reference,
      customerId: order.user.id,
      customerName: label,
      status: order.status,
      productsMinor: order.productsMinor,
      couponDiscountMinor: order.couponDiscountMinor,
      totalMinor: order.totalMinor,
      createdAt: order.createdAt.toISOString(),
    };
  });

  const pendingCartSessions = cartRows.length;
  const pendingCartProductsMinor = cartRows.reduce(
    (sum, row) => sum + asInt(row.productsMinor),
    0,
  );

  return {
    id: coupon.id,
    code: coupon.code,
    name: coupon.name,
    usageCount: Math.max(orders.length, coupon.redemptionCount),
    orderCount: orders.length,
    productsTotalMinor,
    orderTotalMinor,
    couponDiscountTotalMinor,
    pendingCartSessions,
    pendingCartProductsMinor,
    customers: [...customerMap.values()].sort(
      (a, b) => b.orderTotalMinor - a.orderTotalMinor,
    ),
    orders: orderRows,
  };
}
