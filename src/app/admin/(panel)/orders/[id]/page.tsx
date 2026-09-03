import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderAddressKind } from "@prisma/client";
import { ShoppingBag } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { splitFullName } from "@/lib/customers";
import {
  orderStatusLabel,
  parseOrderDocumentKind,
  parseOrderPaymentMethod,
  parseOrderStatus,
} from "@/lib/orders";
import { parseOrderPaymentProvider } from "@/lib/checkout-payment-choice";
import { toOrderCaseView } from "@/lib/order-case-workflow";
import { OrderDetail } from "./order-detail";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    select: { orderNo: true, reference: true },
  });
  return { title: order ? `Sipariş #${order.orderNo}` : "Sipariş" };
}

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          customerNo: true,
          firstName: true,
          lastName: true,
          name: true,
          email: true,
          createdAt: true,
          _count: { select: { orders: true } },
        },
      },
      items: {
        orderBy: { createdAt: "asc" },
        include: { product: { select: { weightKg: true } } },
      },
      addresses: true,
      statusHistory: { orderBy: { createdAt: "desc" } },
      payments: { orderBy: { paidAt: "desc" } },
      refunds: { orderBy: { createdAt: "desc" } },
      cases: {
        orderBy: { createdAt: "desc" },
        include: {
          items: { include: { orderItem: { select: { title: true, variantTitle: true } } } },
          events: { orderBy: { createdAt: "asc" } },
        },
      },
      messages: { orderBy: { createdAt: "desc" } },
      documents: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!order) notFound();

  const variantIds = order.items
    .map((item) => item.variantId)
    .filter((id): id is string => Boolean(id));

  const [previous, next, liveVariants, catalog] = await Promise.all([
    prisma.order.findFirst({
      where: { orderNo: { lt: order.orderNo } },
      orderBy: { orderNo: "desc" },
      select: { id: true },
    }),
    prisma.order.findFirst({
      where: { orderNo: { gt: order.orderNo } },
      orderBy: { orderNo: "asc" },
      select: { id: true },
    }),
    variantIds.length === 0
      ? Promise.resolve([])
      : prisma.productVariant.findMany({
          where: { id: { in: variantIds } },
          select: { id: true, stockQuantity: true },
        }),
    prisma.product.findMany({
      where: { isActive: true, variants: { some: { isActive: true } } },
      orderBy: { title: "asc" },
      select: {
        id: true,
        title: true,
        taxRatePercent: true,
        image: true,
        variants: {
          where: { isActive: true },
          orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }],
          select: {
            id: true,
            title: true,
            sku: true,
            isDefault: true,
            priceMinor: true,
            stockQuantity: true,
            image: true,
          },
        },
      },
    }),
  ]);

  const stockByVariant = new Map(liveVariants.map((variant) => [variant.id, variant.stockQuantity]));
  const computedWeightKg = order.items.reduce((sum, item) => {
    const unit = item.product?.weightKg != null ? Number(item.product.weightKg) : 0;
    return sum + unit * item.quantity;
  }, 0);
  const weightKg = order.weightKg != null ? Number(order.weightKg) : computedWeightKg;

  const fromName = splitFullName(order.user.name);
  const firstName = order.user.firstName?.trim() || fromName.firstName;
  const lastName = order.user.lastName?.trim() || fromName.lastName;
  const displayName = [firstName, lastName].filter(Boolean).join(" ") || order.user.email;
  const shipping = order.addresses.find((address) => address.kind === OrderAddressKind.SHIPPING);
  const billing = order.addresses.find((address) => address.kind === OrderAddressKind.BILLING);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
          <Link href="/admin/orders" className="hover:text-[#405189]">
            Siparişler
          </Link>
        </p>
        <h1 className="mt-1 flex flex-wrap items-center gap-2 text-xl font-semibold text-slate-800 sm:text-2xl">
          <ShoppingBag className="h-6 w-6 text-[#405189]" />
          Sipariş #{order.orderNo} {order.reference} — {displayName}
        </h1>
        <p className="mt-2 text-sm text-slate-500">{orderStatusLabel(parseOrderStatus(order.status))}</p>
      </div>

      <OrderDetail
        order={{
          id: order.id,
          orderNo: order.orderNo,
          reference: order.reference,
          status: parseOrderStatus(order.status),
          paymentMethod: parseOrderPaymentMethod(order.paymentMethod),
          paymentProvider: parseOrderPaymentProvider(order.paymentProvider),
          productsMinor: order.productsMinor,
          shippingMinor: order.shippingMinor,
          taxMinor: order.taxMinor,
          totalMinor: order.totalMinor,
          carrierName: order.carrierName ?? "",
          trackingNumber: order.trackingNumber ?? "",
          weightKg,
          privateNote: order.privateNote ?? "",
          documents: order.documents.map((document) => ({
            id: document.id,
            kind: parseOrderDocumentKind(document.kind),
            number: document.number,
            amountMinor: document.amountMinor,
            createdAt: document.createdAt.toISOString(),
          })),
          createdAt: order.createdAt.toISOString(),
          customer: {
            id: order.user.id,
            customerNo: order.user.customerNo,
            name: displayName,
            email: order.user.email,
            registeredAt: order.user.createdAt.toISOString(),
            orderCount: order.user._count.orders,
          },
          previousId: previous?.id ?? null,
          nextId: next?.id ?? null,
          shipping: shipping
            ? {
                name: `${shipping.firstName} ${shipping.lastName}`.trim(),
                company: shipping.isCorporateInvoice ? shipping.company : null,
                taxOffice: shipping.isCorporateInvoice ? shipping.taxOffice : null,
                taxNumber: shipping.isCorporateInvoice ? shipping.taxNumber : null,
                lines: [
                  shipping.line1,
                  shipping.line2,
                  [shipping.neighborhood, shipping.district, shipping.city].filter(Boolean).join(" / "),
                  [shipping.postalCode, shipping.country].filter(Boolean).join(" "),
                  shipping.phone,
                ].filter((line): line is string => Boolean(line)),
              }
            : null,
          billing: billing
            ? {
                name: `${billing.firstName} ${billing.lastName}`.trim(),
                company: billing.isCorporateInvoice ? billing.company : null,
                taxOffice: billing.isCorporateInvoice ? billing.taxOffice : null,
                taxNumber: billing.isCorporateInvoice ? billing.taxNumber : null,
                lines: [
                  billing.line1,
                  billing.line2,
                  [billing.neighborhood, billing.district, billing.city].filter(Boolean).join(" / "),
                  [billing.postalCode, billing.country].filter(Boolean).join(" "),
                  billing.phone,
                ].filter((line): line is string => Boolean(line)),
              }
            : null,
          items: order.items.map((item) => ({
            id: item.id,
            title: item.title,
            variantTitle: item.variantTitle,
            sku: item.sku,
            quantity: item.quantity,
            unitPriceMinor: item.unitPriceMinor,
            taxRatePercent: item.taxRatePercent,
            totalMinor: item.totalMinor,
            image: item.image,
            stock: item.variantId ? (stockByVariant.get(item.variantId) ?? null) : null,
          })),
          catalog: catalog.map((product) => ({
            id: product.id,
            title: product.title,
            taxRatePercent: product.taxRatePercent,
            image: product.image,
            variants: product.variants.map((variant) => ({
              id: variant.id,
              title: variant.title,
              sku: variant.sku,
              isDefault: variant.isDefault,
              priceExclMinor: variant.priceMinor,
              stock: variant.stockQuantity,
              image: variant.image,
            })),
          })),
          history: order.statusHistory.map((event) => ({
            id: event.id,
            status: parseOrderStatus(event.status),
            createdAt: event.createdAt.toISOString(),
          })),
          payments: order.payments.map((payment) => ({
            id: payment.id,
            method: parseOrderPaymentMethod(payment.method),
            amountMinor: payment.amountMinor,
            transactionId: payment.transactionId,
            paidAt: payment.paidAt.toISOString(),
          })),
          refunds: order.refunds.map((refund) => ({
            id: refund.id,
            amountMinor: refund.amountMinor,
            provider: refund.provider,
            transactionId: refund.transactionId,
            note: refund.note,
            createdAt: refund.createdAt.toISOString(),
          })),
          cases: order.cases.map(toOrderCaseView),
          messages: order.messages.map((message) => ({
            id: message.id,
            body: message.body,
            visibleToCustomer: message.visibleToCustomer,
            createdAt: message.createdAt.toISOString(),
          })),
        }}
      />
    </div>
  );
}
