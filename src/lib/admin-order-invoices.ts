import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatOrderDocumentNumber, parseOrderStatus, type OrderStatusCode } from "@/lib/orders";

export const ADMIN_INVOICES_PAGE_SIZE = 40;

export type AdminInvoiceRow = {
  id: string;
  orderId: string;
  number: number;
  documentNo: string;
  amountMinor: number;
  createdAt: string;
  orderNo: number;
  reference: string;
  status: OrderStatusCode;
  customerName: string;
  customerEmail: string;
  company: string | null;
};

export type AdminInvoiceListQuery = {
  q: string;
  page: number;
};

export type AdminInvoiceListResult = {
  invoices: AdminInvoiceRow[];
  query: AdminInvoiceListQuery;
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
};

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function sanitizeSearch(raw: string) {
  return raw.trim().replace(/%/g, "").slice(0, 120);
}

function parsePositiveInt(value: string) {
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function parseInvoiceNumber(raw: string) {
  return parsePositiveInt(raw.trim().replace(/^FAT-?/i, ""));
}

export function parseAdminInvoiceListQuery(
  searchParams: Record<string, string | string[] | undefined>,
): AdminInvoiceListQuery {
  const pageRaw = Number.parseInt(firstParam(searchParams.page) || "1", 10);
  return {
    q: sanitizeSearch(firstParam(searchParams.q)),
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1,
  };
}

export function adminInvoiceListHref(query: AdminInvoiceListQuery, page = query.page) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/admin/orders/invoices?${qs}` : "/admin/orders/invoices";
}

function invoiceListWhere(q: string): Prisma.OrderDocumentWhereInput {
  const base: Prisma.OrderDocumentWhereInput = { kind: "INVOICE" };
  if (!q) return base;

  const clauses: Prisma.OrderDocumentWhereInput[] = [
    { order: { reference: { contains: q } } },
    { order: { user: { email: { contains: q } } } },
    { order: { user: { name: { contains: q } } } },
    { order: { user: { firstName: { contains: q } } } },
    { order: { user: { lastName: { contains: q } } } },
    { order: { addresses: { some: { company: { contains: q } } } } },
    { order: { addresses: { some: { taxNumber: { contains: q } } } } },
  ];

  const invoiceNo = parseInvoiceNumber(q);
  if (invoiceNo != null) clauses.push({ number: invoiceNo });

  const orderNo = parsePositiveInt(q.replace(/^#/, ""));
  if (orderNo != null) clauses.push({ order: { orderNo } });

  return { AND: [base, { OR: clauses }] };
}

export async function loadAdminInvoicePage(
  query: AdminInvoiceListQuery,
): Promise<AdminInvoiceListResult> {
  const pageSize = ADMIN_INVOICES_PAGE_SIZE;
  const where = invoiceListWhere(query.q);
  const requestedPage = Math.max(1, query.page);

  const [total, rows] = await Promise.all([
    prisma.orderDocument.count({ where }),
    prisma.orderDocument.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { number: "desc" }],
      skip: (requestedPage - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        number: true,
        amountMinor: true,
        createdAt: true,
        order: {
          select: {
            id: true,
            orderNo: true,
            reference: true,
            status: true,
            user: { select: { name: true, firstName: true, lastName: true, email: true } },
            addresses: {
              where: { kind: "BILLING" },
              select: { company: true, isCorporateInvoice: true, firstName: true, lastName: true },
            },
          },
        },
      },
    }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const invoices =
    rows.length > 0 || total === 0 || page === requestedPage
      ? rows
      : await prisma.orderDocument.findMany({
          where,
          orderBy: [{ createdAt: "desc" }, { number: "desc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            id: true,
            number: true,
            amountMinor: true,
            createdAt: true,
            order: {
              select: {
                id: true,
                orderNo: true,
                reference: true,
                status: true,
                user: { select: { name: true, firstName: true, lastName: true, email: true } },
                addresses: {
                  where: { kind: "BILLING" },
                  select: { company: true, isCorporateInvoice: true, firstName: true, lastName: true },
                },
              },
            },
          },
        });

  return {
    query: { ...query, page },
    total,
    page,
    pageCount,
    pageSize,
    invoices: invoices.map((row) => {
      const billing = row.order.addresses[0];
      const customerName =
        [row.order.user.firstName, row.order.user.lastName].filter(Boolean).join(" ") ||
        row.order.user.name ||
        row.order.user.email;
      return {
        id: row.id,
        orderId: row.order.id,
        number: row.number,
        documentNo: formatOrderDocumentNumber("INVOICE", row.number),
        amountMinor: row.amountMinor,
        createdAt: row.createdAt.toISOString(),
        orderNo: row.order.orderNo,
        reference: row.order.reference,
        status: parseOrderStatus(row.order.status),
        customerName,
        customerEmail: row.order.user.email,
        company: billing?.isCorporateInvoice ? billing.company : null,
      };
    }),
  };
}
