import { OrderAddressKind, OrderCaseStatus, OrderStatus, Prisma } from "@prisma/client";
import { splitFullName } from "@/lib/customers";
import { parseOrderStatus, type OrderStatusCode } from "@/lib/orders";
import { prisma } from "@/lib/prisma";

export const WAREHOUSE_PAGE_SIZE = 25;

export type WarehouseListKind = "ready" | "shipped";

export type WarehouseReadyRow = {
  id: string;
  orderNo: number;
  reference: string;
  customerName: string;
  city: string;
  status: OrderStatusCode;
  packed: number;
  total: number;
  createdAt: string;
};

const OPEN_CASE_BLOCK = [
  OrderCaseStatus.REQUESTED,
  OrderCaseStatus.APPROVED,
  OrderCaseStatus.AWAITING_RETURN,
  OrderCaseStatus.RECEIVED,
] as const;

const ORDER_LIST_SELECT = {
  id: true,
  orderNo: true,
  reference: true,
  status: true,
  createdAt: true,
  user: { select: { firstName: true, lastName: true, name: true, email: true } },
  items: { select: { quantity: true, packedQuantity: true } },
  addresses: { select: { kind: true, city: true } },
} satisfies Prisma.OrderSelect;

export function warehouseListWhere(kind: WarehouseListKind): Prisma.OrderWhereInput {
  switch (kind) {
    case "ready":
      return {
        status: { in: [OrderStatus.PAYMENT_ACCEPTED, OrderStatus.PROCESSING] },
        cases: { none: { status: { in: [...OPEN_CASE_BLOCK] } } },
      };
    case "shipped":
      return { status: OrderStatus.SHIPPED };
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function searchWhere(q: string): Prisma.OrderWhereInput | null {
  const needle = q.trim().replace(/^#/, "");
  if (!needle) return null;

  const or: Prisma.OrderWhereInput[] = [
    { reference: { contains: needle } },
    { trackingNumber: { contains: needle } },
    { carrierName: { contains: needle } },
    {
      user: {
        OR: [
          { firstName: { contains: needle } },
          { lastName: { contains: needle } },
          { name: { contains: needle } },
          { email: { contains: needle } },
        ],
      },
    },
    {
      addresses: {
        some: {
          OR: [
            { city: { contains: needle } },
            { firstName: { contains: needle } },
            { lastName: { contains: needle } },
          ],
        },
      },
    },
  ];

  if (/^\d+$/.test(needle)) {
    or.unshift({ orderNo: Number.parseInt(needle, 10) });
  }

  return { OR: or };
}

export function parseWarehouseListQuery(params: Record<string, string | string[] | undefined>) {
  const first = (key: string) => {
    const value = params[key];
    return (Array.isArray(value) ? value[0] : value) ?? "";
  };
  return {
    q: first("q").trim(),
    page: Number.parseInt(first("page") || "1", 10) || 1,
  };
}

function toWarehouseRow(order: {
  id: string;
  orderNo: number;
  reference: string;
  status: OrderStatus;
  createdAt: Date;
  user: { firstName: string | null; lastName: string | null; name: string | null; email: string };
  items: { quantity: number; packedQuantity: number }[];
  addresses: { kind: OrderAddressKind; city: string }[];
}): WarehouseReadyRow {
  const fromName = splitFullName(order.user.name);
  const customerName =
    [order.user.firstName?.trim() || fromName.firstName, order.user.lastName?.trim() || fromName.lastName]
      .filter(Boolean)
      .join(" ") || order.user.email;
  const shipping = order.addresses.find((address) => address.kind === OrderAddressKind.SHIPPING);
  const packed = order.items.reduce(
    (sum, item) => sum + Math.min(item.packedQuantity, item.quantity),
    0,
  );
  const total = order.items.reduce((sum, item) => sum + item.quantity, 0);
  return {
    id: order.id,
    orderNo: order.orderNo,
    reference: order.reference,
    customerName,
    city: shipping?.city ?? "",
    status: parseOrderStatus(order.status),
    packed,
    total,
    createdAt: order.createdAt.toISOString(),
  };
}

export type WarehouseOrderPage = {
  rows: WarehouseReadyRow[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  readyCount: number;
  shippedCount: number;
  q: string;
  loadError?: string;
};

export async function loadWarehouseOrderPage(input: {
  kind: WarehouseListKind;
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<WarehouseOrderPage> {
  const pageSize = input.pageSize ?? WAREHOUSE_PAGE_SIZE;
  const requestedPage = Math.max(1, input.page ?? 1);
  const q = (input.q ?? "").trim();
  const search = searchWhere(q);
  const base = warehouseListWhere(input.kind);
  const where: Prisma.OrderWhereInput = search ? { AND: [base, search] } : base;

  try {
    const [matchedTotal, readyCount, shippedCount] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.count({ where: warehouseListWhere("ready") }),
      prisma.order.count({ where: warehouseListWhere("shipped") }),
    ]);
    const pageCount = Math.max(1, Math.ceil(matchedTotal / pageSize));
    const page = Math.min(requestedPage, pageCount);
    const orders = await prisma.order.findMany({
      where,
      orderBy: input.kind === "ready" ? { orderNo: "asc" } : { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: ORDER_LIST_SELECT,
    });

    return {
      rows: orders.map(toWarehouseRow),
      total: matchedTotal,
      page,
      pageCount,
      pageSize,
      readyCount,
      shippedCount,
      q,
    };
  } catch (error) {
    console.error(error);
    return {
      rows: [] as WarehouseReadyRow[],
      total: 0,
      page: 1,
      pageCount: 1,
      pageSize,
      readyCount: 0,
      shippedCount: 0,
      q,
      loadError: "Depo listesi yüklenemedi. Geliştirme sunucusunu yeniden başlatın.",
    };
  }
}
