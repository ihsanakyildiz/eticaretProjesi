import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  formatOrderDateTime,
  orderPaymentMethodLabel,
  orderStatusBadgeClass,
  orderStatusLabel,
  parseOrderPaymentMethod,
  parseOrderStatus,
} from "@/lib/orders";
import {
  orderPaymentProviderLabel,
  parseOrderPaymentProvider,
} from "@/lib/checkout-payment-choice";
import { formatMinorTry } from "@/lib/product-money";
import { canOpenOrderReviews } from "@/lib/reviews";
import { ensureMemberPortalAccess } from "../../actions";
import { toOrderCaseView } from "@/lib/order-case-workflow";
import { loadOrderShipmentTracking } from "@/lib/shipment-tracking";
import { MemberOrderCasePanel } from "./member-order-case-panel";
import { MemberShipmentTracking } from "./member-shipment-tracking";

type PageProps = {
  params: Promise<{ reference: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { reference } = await params;
  return { title: `Sipariş ${reference}` };
}

function formatOrderAddress(address: {
  firstName: string;
  lastName: string;
  line1: string;
  line2: string | null;
  neighborhood: string | null;
  district: string | null;
  city: string;
  postalCode: string | null;
  country: string;
  phone: string | null;
}) {
  return [
    `${address.firstName} ${address.lastName}`,
    address.line1,
    address.line2,
    [address.neighborhood, address.district, address.city].filter(Boolean).join(", "),
    address.postalCode,
    address.country,
    address.phone,
  ]
    .filter(Boolean)
    .join(" · ");
}

export default async function MemberOrderDetailPage({ params }: PageProps) {
  const access = await ensureMemberPortalAccess();
  if (!access.ok) {
    redirect("/giris?callbackUrl=/uye/siparisler");
  }

  const { reference } = await params;
  const order = await prisma.order.findFirst({
    where: { reference, userId: access.session.user.id },
    include: {
      items: true,
      addresses: true,
      statusHistory: { orderBy: { createdAt: "desc" } },
      cases: {
        orderBy: { createdAt: "desc" },
        include: {
          items: { include: { orderItem: { select: { title: true, variantTitle: true } } } },
          events: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });
  if (!order) notFound();

  const personalizationRows = await prisma
    .$queryRaw<Array<{ id: string; personalizationJson: string | null }>>`
      SELECT id, personalizationJson
      FROM order_items
      WHERE orderId = ${order.id}
    `
    .catch(() => [] as Array<{ id: string; personalizationJson: string | null }>);
  const personalizationByItemId = new Map(
    personalizationRows.map((row) => [row.id, row.personalizationJson]),
  );

  const status = parseOrderStatus(order.status);
  const shipping = order.addresses.find((row) => row.kind === "SHIPPING");
  const billing = order.addresses.find((row) => row.kind === "BILLING");
  const paymentProvider = parseOrderPaymentProvider(order.paymentProvider);
  const paymentLabel = paymentProvider
    ? `${orderPaymentMethodLabel(parseOrderPaymentMethod(order.paymentMethod))} (${orderPaymentProviderLabel(paymentProvider)})`
    : orderPaymentMethodLabel(parseOrderPaymentMethod(order.paymentMethod));
  const shipmentTracking = await loadOrderShipmentTracking({
    id: order.id,
    status: order.status,
    carrierName: order.carrierName,
    trackingNumber: order.trackingNumber,
  });

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-site-border bg-site-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link
              href="/uye/siparisler"
              className="text-sm font-medium text-site-primary hover:underline"
            >
              ← Siparişlerim
            </Link>
            <h2 className="mt-3 text-lg font-semibold text-site-fg">Sipariş #{order.reference}</h2>
            <p className="mt-1 text-sm text-site-muted">
              {formatOrderDateTime(order.createdAt.toISOString())}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${orderStatusBadgeClass(status)}`}
            >
              {orderStatusLabel(status)}
            </span>
            {canOpenOrderReviews(status) ? (
              <Link
                href={`/uye/siparisler/${order.reference}/degerlendir`}
                className="rounded-lg bg-site-primary px-3 py-2 text-sm font-medium text-white"
              >
                Değerlendir
              </Link>
            ) : null}
          </div>
        </div>

        <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-site-muted">Ödeme</dt>
            <dd className="mt-0.5 font-medium text-site-fg">{paymentLabel}</dd>
          </div>
          <div>
            <dt className="text-site-muted">Kargo</dt>
            <dd className="mt-0.5 font-medium text-site-fg">
              {order.carrierName || "—"}
              {order.trackingNumber ? ` · ${order.trackingNumber}` : ""}
            </dd>
          </div>
        </dl>
      </section>

      {shipmentTracking ? <MemberShipmentTracking tracking={shipmentTracking} /> : null}

      <section className="rounded-2xl border border-site-border bg-site-card p-5 sm:p-6">
        <h3 className="text-base font-semibold text-site-fg">Ürünler</h3>
        <ul className="mt-4 space-y-3 text-sm">
          {order.items.map((item) => {
            let personalizationNote = "";
            try {
              const raw = personalizationByItemId.get(item.id);
              if (raw) {
                const parsed = JSON.parse(raw) as { summary?: unknown };
                personalizationNote = String(parsed.summary ?? "").trim();
              }
            } catch {
              personalizationNote = "";
            }
            return (
            <li key={item.id} className="flex justify-between gap-4">
              <span className="text-site-fg">
                {item.title}
                {item.variantTitle ? ` (${item.variantTitle})` : ""} × {item.quantity}
                {personalizationNote ? (
                  <span className="mt-1 block text-xs text-site-muted">{personalizationNote}</span>
                ) : null}
              </span>
              <span className="font-medium">{formatMinorTry(item.totalMinor)}</span>
            </li>
            );
          })}
        </ul>
        <div className="mt-4 space-y-2 border-t border-site-border pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-site-muted">Ürünler</span>
            <span>{formatMinorTry(order.productsMinor)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-site-muted">Kargo</span>
            <span>{order.shippingMinor > 0 ? formatMinorTry(order.shippingMinor) : "Ücretsiz"}</span>
          </div>
          <div className="flex justify-between text-base font-semibold text-site-fg">
            <span>Toplam</span>
            <span>{formatMinorTry(order.totalMinor)}</span>
          </div>
        </div>
      </section>

      <MemberOrderCasePanel
        reference={order.reference}
        status={status}
        items={order.items.map((item) => ({
          id: item.id,
          title: item.title,
          variantTitle: item.variantTitle,
          quantity: item.quantity,
        }))}
        cases={order.cases.map(toOrderCaseView)}
      />

      <section className="rounded-2xl border border-site-border bg-site-card p-5 sm:p-6">
        <h3 className="text-base font-semibold text-site-fg">Adresler</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-site-fg">Teslimat</p>
            <p className="mt-1 text-sm text-site-muted">
              {shipping ? formatOrderAddress(shipping) : "—"}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-site-fg">Fatura</p>
            <p className="mt-1 text-sm text-site-muted">
              {billing ? formatOrderAddress(billing) : "—"}
            </p>
          </div>
        </div>
      </section>

      {order.statusHistory.length > 0 ? (
        <section className="rounded-2xl border border-site-border bg-site-card p-5 sm:p-6">
          <h3 className="text-base font-semibold text-site-fg">Sipariş geçmişi</h3>
          <ul className="mt-4 space-y-3">
            {order.statusHistory.map((event) => (
              <li key={event.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-site-fg">
                  {orderStatusLabel(parseOrderStatus(event.status))}
                </span>
                <span className="text-site-muted">
                  {formatOrderDateTime(event.createdAt.toISOString())}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
