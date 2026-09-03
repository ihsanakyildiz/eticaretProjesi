import type { Metadata } from "next";
import { headers } from "next/headers";
import { OrderAddressKind } from "@prisma/client";
import { PaytrCheckoutFrame } from "@/components/site/checkout/paytr-checkout-frame";
import { SiteLink } from "@/components/site/site-link";
import { isPaytrConfigured } from "@/lib/checkout-payments";
import { createPaytrIframeToken } from "@/lib/paytr";
import { requirePendingCardOrder } from "@/lib/pending-card-order";
import { ipFromRequestHeaders } from "@/lib/request-ip";
import { getSettingsMapUncached } from "@/lib/settings";
import { getSiteOrigin } from "@/lib/site-origin";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ reference: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { reference } = await params;
  return { title: `PayTR ödeme — ${reference}` };
}

export default async function PaytrCheckoutPage({ params }: PageProps) {
  const { reference } = await params;
  const { order } = await requirePendingCardOrder(reference, "paytr");
  const settings = await getSettingsMapUncached();
  if (!isPaytrConfigured(settings)) {
    return (
      <PaymentError
        title="PayTR şu an kullanılamıyor"
        message="Ödeme sağlayıcısı yapılandırılmamış. Başka bir yöntem seçin."
      />
    );
  }

  const shipping = order.addresses.find((row) => row.kind === OrderAddressKind.SHIPPING);
  const billing = order.addresses.find((row) => row.kind === OrderAddressKind.BILLING) ?? shipping;
  if (!shipping || !billing) {
    return (
      <PaymentError title="Adres eksik" message="Sipariş adresleri bulunamadı. Ödeme sayfasına dönün." />
    );
  }

  const origin = getSiteOrigin(settings);
  const email = order.user.email?.trim();
  if (!email) {
    return (
      <PaymentError title="E-posta gerekli" message="Kart ödemesi için hesap e-postası gerekir." />
    );
  }

  const result = await createPaytrIframeToken({
    settings,
    merchantOid: order.reference,
    email,
    paymentAmountMinor: order.totalMinor,
    userIp: ipFromRequestHeaders(await headers()),
    userName: `${shipping.firstName} ${shipping.lastName}`.trim(),
    userAddress: [shipping.line1, shipping.line2, shipping.district, shipping.city]
      .filter(Boolean)
      .join(" "),
    userPhone: shipping.phone ?? billing.phone,
    merchantOkUrl: `${origin}/siparis/tesekkur/${order.reference}?odeme=ok`,
    merchantFailUrl: `${origin}/odeme?adim=odeme&iptal=1`,
    items: order.items.map((item) => ({
      name: item.variantTitle ? `${item.title} (${item.variantTitle})` : item.title,
      unitPriceMinor: item.totalMinor,
      quantity: 1,
    })),
    shippingMinor: order.shippingMinor,
  });

  if (!result.ok) {
    return <PaymentError title="PayTR ödeme formu açılamadı" message={result.error} />;
  }

  return (
    <section className="border-b border-site-border py-10 sm:py-14">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold tracking-wide text-site-primary uppercase">Ödeme</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-site-fg">PayTR ile öde</h1>
        <p className="mt-2 text-sm text-site-muted">
          Sipariş {order.reference} · 3D Secure ve taksit seçenekleri aşağıdaki ekranda
        </p>
        <div className="mt-6">
          <PaytrCheckoutFrame token={result.token} />
        </div>
      </div>
    </section>
  );
}

function PaymentError({ title, message }: { title: string; message: string }) {
  return (
    <section className="border-b border-site-border py-12 sm:py-16">
      <div className="mx-auto max-w-lg px-4 text-center sm:px-6">
        <h1 className="font-display text-2xl font-bold text-site-fg">{title}</h1>
        <p className="mt-3 text-sm text-site-muted">{message}</p>
        <SiteLink href="/odeme?adim=odeme" className="mt-6 inline-block text-sm font-semibold text-site-primary">
          Ödeme yöntemine dön
        </SiteLink>
      </div>
    </section>
  );
}
