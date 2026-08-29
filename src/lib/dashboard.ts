import { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { splitFullName } from "@/lib/customers";
import { getUnreadMailNotificationCount } from "@/lib/mail-notifications";
import { parseOrderStatus, type OrderStatusCode } from "@/lib/orders";
import { formatMinorTry } from "@/lib/product-money";

const PAID_STATUSES: OrderStatus[] = [
  OrderStatus.PAYMENT_ACCEPTED,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

export const DASHBOARD_PERIODS = ["day", "month", "year", "day-1", "month-1", "year-1"] as const;
export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];

export type DashboardMetricId =
  | "sales"
  | "orders"
  | "cart"
  | "visits"
  | "conversion"
  | "profit";

export type DashboardChartPoint = {
  label: string;
  fullLabel: string;
  salesMinor: number;
  orderCount: number;
};

export type DashboardRecentOrder = {
  id: string;
  orderNo: number;
  reference: string;
  customerName: string;
  itemCount: number;
  productsMinor: number;
  createdAt: string;
  status: OrderStatusCode;
};

export type DashboardTopProduct = {
  id: string;
  title: string;
  image: string | null;
  quantity: number;
  totalMinor: number;
};

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function parsePeriod(value: string | undefined): DashboardPeriod {
  switch (value) {
    case "day":
    case "month":
    case "year":
    case "day-1":
    case "month-1":
    case "year-1":
      return value;
    default:
      return "month";
  }
}

function parseFromDate(raw: string | undefined): Date | null {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function resolveDashboardRange(
  periodRaw: string | undefined,
  fromRaw: string | undefined,
): { period: DashboardPeriod; start: Date; end: Date; fromValue: string; bucket: "hour" | "day" | "month" } {
  const period = parsePeriod(periodRaw);
  const now = new Date();
  const today = startOfDay(now);
  const customFrom = parseFromDate(fromRaw);

  let start = today;
  let end = now;
  let bucket: "hour" | "day" | "month" = "day";

  switch (period) {
    case "day":
      start = today;
      end = now;
      bucket = "hour";
      break;
    case "day-1":
      start = startOfDay(new Date(today.getTime() - 86_400_000));
      end = endOfDay(start);
      bucket = "hour";
      break;
    case "month":
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = now;
      bucket = "day";
      break;
    case "month-1": {
      const firstPrev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      start = firstPrev;
      end = endOfDay(new Date(today.getFullYear(), today.getMonth(), 0));
      bucket = "day";
      break;
    }
    case "year":
      start = new Date(today.getFullYear(), 0, 1);
      end = now;
      bucket = "month";
      break;
    case "year-1":
      start = new Date(today.getFullYear() - 1, 0, 1);
      end = endOfDay(new Date(today.getFullYear() - 1, 11, 31));
      bucket = "month";
      break;
    default: {
      const _exhaustive: never = period;
      return _exhaustive;
    }
  }

  if (customFrom && customFrom < end) {
    start = startOfDay(customFrom);
    if (end.getTime() - start.getTime() > 1000 * 60 * 60 * 24 * 90) bucket = "month";
    else if (end.getTime() - start.getTime() > 1000 * 60 * 60 * 36) bucket = "day";
    else bucket = "hour";
  }

  return {
    period,
    start,
    end,
    fromValue: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`,
    bucket,
  };
}

function bucketKey(date: Date, bucket: "hour" | "day" | "month") {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  switch (bucket) {
    case "hour":
      return `${year}-${month}-${day} ${hour}:00`;
    case "day":
      return `${year}-${month}-${day}`;
    case "month":
      return `${year}-${month}`;
    default: {
      const _exhaustive: never = bucket;
      return _exhaustive;
    }
  }
}

function buildBuckets(start: Date, end: Date, bucket: "hour" | "day" | "month"): DashboardChartPoint[] {
  const points: DashboardChartPoint[] = [];
  const cursor = new Date(start);
  if (bucket === "hour") cursor.setMinutes(0, 0, 0);
  if (bucket === "day") cursor.setHours(0, 0, 0, 0);
  if (bucket === "month") cursor.setDate(1);

  while (cursor <= end) {
    const key = bucketKey(cursor, bucket);
    const fullLabel = cursor.toLocaleString("tr-TR", {
      day: bucket === "month" ? undefined : "numeric",
      month: "long",
      year: "numeric",
      hour: bucket === "hour" ? "2-digit" : undefined,
    });
    const label =
      bucket === "hour"
        ? `${cursor.getHours().toString().padStart(2, "0")}:00`
        : bucket === "month"
          ? cursor.toLocaleDateString("tr-TR", { month: "short" })
          : cursor.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
    points.push({ label, fullLabel, salesMinor: 0, orderCount: 0 });
    if (bucket === "hour") cursor.setHours(cursor.getHours() + 1);
    else if (bucket === "day") cursor.setDate(cursor.getDate() + 1);
    else cursor.setMonth(cursor.getMonth() + 1);
    if (points.length > 366) break;
    void key;
  }
  return points;
}

function findBucketIndex(points: DashboardChartPoint[], date: Date, start: Date, bucket: "hour" | "day" | "month") {
  const cursor = new Date(start);
  if (bucket === "hour") cursor.setMinutes(0, 0, 0);
  if (bucket === "day") cursor.setHours(0, 0, 0, 0);
  if (bucket === "month") cursor.setDate(1);
  const target = bucketKey(date, bucket);
  for (let index = 0; index < points.length; index += 1) {
    if (bucketKey(cursor, bucket) === target) return index;
    if (bucket === "hour") cursor.setHours(cursor.getHours() + 1);
    else if (bucket === "day") cursor.setDate(cursor.getDate() + 1);
    else cursor.setMonth(cursor.getMonth() + 1);
  }
  return -1;
}

export async function getDashboardData(periodRaw?: string, fromRaw?: string) {
  const range = resolveDashboardRange(periodRaw, fromRaw);

  const [
    periodOrders,
    recentOrders,
    topItemGroups,
    awaitingPayment,
    outOfStock,
    unreadMessages,
  ] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: range.start, lte: range.end } },
      select: {
        createdAt: true,
        status: true,
        productsMinor: true,
      },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        orderNo: true,
        reference: true,
        productsMinor: true,
        createdAt: true,
        status: true,
        user: { select: { firstName: true, lastName: true, name: true, email: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        productId: { not: null },
        order: {
          createdAt: { gte: range.start, lte: range.end },
          status: { in: PAID_STATUSES },
        },
      },
      _sum: { quantity: true, totalMinor: true },
      orderBy: { _sum: { totalMinor: "desc" } },
      take: 10,
    }),
    prisma.order.count({ where: { status: OrderStatus.AWAITING_PAYMENT } }),
    prisma.productVariant.count({
      where: { trackInventory: true, stockQuantity: { lte: 0 } },
    }),
    getUnreadMailNotificationCount(),
  ]);

  const paid = periodOrders.filter((order) => PAID_STATUSES.includes(order.status));
  const salesExclMinor = paid.reduce((sum, order) => sum + order.productsMinor, 0);
  const orderCount = periodOrders.filter((order) => order.status !== OrderStatus.CANCELED).length;
  const cartMinor = paid.length > 0 ? Math.round(salesExclMinor / paid.length) : 0;

  const chart = buildBuckets(range.start, range.end, range.bucket);
  for (const order of paid) {
    const index = findBucketIndex(chart, order.createdAt, range.start, range.bucket);
    if (index < 0) continue;
    chart[index].salesMinor += order.productsMinor;
    chart[index].orderCount += 1;
  }

  const recent: DashboardRecentOrder[] = recentOrders.map((order) => {
    const fromName = splitFullName(order.user.name);
    const firstName = order.user.firstName?.trim() || fromName.firstName;
    const lastName = order.user.lastName?.trim() || fromName.lastName;
    return {
      id: order.id,
      orderNo: order.orderNo,
      reference: order.reference,
      customerName: [firstName, lastName].filter(Boolean).join(" ") || order.user.email,
      itemCount: order._count.items,
      productsMinor: order.productsMinor,
      createdAt: order.createdAt.toISOString(),
      status: parseOrderStatus(order.status),
    };
  });

  const productIds = topItemGroups
    .map((row) => row.productId)
    .filter((id): id is string => Boolean(id));
  const products = productIds.length
    ? await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, title: true, image: true },
      })
    : [];
  const productById = new Map(products.map((product) => [product.id, product]));
  const topProducts: DashboardTopProduct[] = topItemGroups.flatMap((row) => {
    if (!row.productId) return [];
    const product = productById.get(row.productId);
    return [
      {
        id: row.productId,
        title: product?.title ?? "Silinmiş ürün",
        image: product?.image ?? null,
        quantity: row._sum.quantity ?? 0,
        totalMinor: row._sum.totalMinor ?? 0,
      },
    ];
  });

  return {
    range,
    metrics: {
      sales: formatMinorTry(salesExclMinor),
      salesMinor: salesExclMinor,
      orders: String(orderCount),
      orderCount,
      cart: formatMinorTry(cartMinor),
      cartMinor,
      visits: "—",
      conversion: "—",
      profit: "—",
    },
    chart,
    recent,
    topProducts,
    activity: {
      activeCarts: 0,
      pendingOrders: awaitingPayment,
      returns: 0,
      abandonedCarts: 0,
      outOfStock,
      newMessages: unreadMessages,
      reviews: 0,
    },
  };
}
