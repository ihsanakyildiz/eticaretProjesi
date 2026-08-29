import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { auth } from "@/auth";
import { OrderThanksClearCart } from "@/components/site/checkout/order-thanks-clear-cart";
import { SiteLink } from "@/components/site/site-link";
import { OrderPaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatMinorTry } from "@/lib/product-money";

type PageProps = {
  params: Promise<{ reference: string }>;
};

function paymentLabel(method: OrderPaymentMethod) {
  switch (method) {
    case OrderPaymentMethod.BANK_WIRE:
      return "Havale / EFT";
    case OrderPaymentMethod.CASH_ON_DELIVERY:
      return "Kapıda ödeme";
    case OrderPaymentMethod.CREDIT_CARD:
      return "Kredi kartı";
    case OrderPaymentMethod.OTHER:
      return "Diğer";
    default: {
      const _exhaustive: never = method;
      return _exhaustive;
    }
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { reference } = await params;
  return { title: `Sipariş ${reference}` };
}

export default async function OrderThanksPage({ params }: PageProps) {
  const { reference } = await params;
  const session = await auth().catch(() => null);
  const order = await prisma.order.findUnique({
    where: { reference },
    include: {
      items: true,
      addresses: true,
    },
  });
  if (!order) notFound();
  if (session?.user?.id && order.userId !== session.user.id && session.user.role === "MEMBER") {
    notFound();
  }

  const shipping = order.addresses.find((row) => row.kind === "SHIPPING");

  return (
    <section className="border-b border-site-border py-12 sm:py-16">
      <OrderThanksClearCart />
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <CheckCircle2 className="mx-auto h-14 w-14 text-site-primary" />
        <p className="mt-4 text-xs font-semibold tracking-wide text-site-primary uppercase">
          Sipariş alındı
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-site-fg">Teşekkürler</h1>
        <p className="mt-3 text-site-muted">
          Sipariş numaranız <span className="font-semibold text-site-fg">{order.reference}</span>
        </p>
        <p className="mt-1 text-sm text-site-muted">
          Ödeme: {paymentLabel(order.paymentMethod)}
          {order.carrierName ? ` · Kargo: ${order.carrierName}` : ""}
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-3xl rounded-lg border border-site-border bg-site-card p-5 sm:p-6">
        <ul className="space-y-3 text-sm">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-4">
              <span className="text-site-fg">
                {item.title}
                {item.variantTitle ? ` (${item.variantTitle})` : ""} × {item.quantity}
              </span>
              <span className="font-medium">{formatMinorTry(item.totalMinor)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between border-t border-site-border pt-4 text-sm">
          <span className="text-site-muted">Kargo</span>
          <span>{order.shippingMinor > 0 ? formatMinorTry(order.shippingMinor) : "Ücretsiz"}</span>
        </div>
        <p className="mt-3 text-right text-lg font-bold text-site-fg">
          {formatMinorTry(order.totalMinor)}
        </p>
        {shipping ? (
          <p className="mt-4 text-sm text-site-muted">
            Teslimat: {shipping.firstName} {shipping.lastName}, {shipping.line1}, {shipping.city}
          </p>
        ) : null}
        {order.paymentMethod === "BANK_WIRE" ? (
          <p className="mt-4 rounded-md bg-site-surface px-4 py-3 text-sm text-site-muted">
            Havale / EFT ile ödemenizi yaptıktan sonra siparişiniz hazırlanacaktır. Hesap bilgileri
            e-posta ile iletilebilir veya müşteri hizmetlerinden sorulabilir.
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <SiteLink
            href={`/uye/siparisler/${order.reference}`}
            className="rounded-md bg-site-primary px-5 py-2.5 text-sm font-semibold text-white"
          >
            Siparişimi gör
          </SiteLink>
          <SiteLink
            href="/katalog"
            className="rounded-md border border-site-border px-5 py-2.5 text-sm font-semibold"
          >
            Alışverişe devam et
          </SiteLink>
          <SiteLink href="/" className="rounded-md border border-site-border px-5 py-2.5 text-sm font-semibold">
            Ana sayfa
          </SiteLink>
        </div>
      </div>
    </section>
  );
}
