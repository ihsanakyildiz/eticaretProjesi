import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { OrderAddressKind } from "@prisma/client";
import { IyzicoCheckoutEmbed } from "@/components/site/checkout/iyzico-checkout-embed";
import { SiteLink } from "@/components/site/site-link";
import { isIyzicoConfigured } from "@/lib/checkout-payments";
import {
  restrictIyzicoCheckoutToCard,
  initializeIyzicoCheckoutForm,
} from "@/lib/iyzico";
import { finalizeIyzicoCheckout } from "@/lib/iyzico-complete";
import { formatMinorTry } from "@/lib/product-money";
import { requirePendingCardOrder } from "@/lib/pending-card-order";
import { prisma } from "@/lib/prisma";
import { ipFromRequestHeaders } from "@/lib/request-ip";
import { getSettingsMapUncached } from "@/lib/settings";
import { originFromHeaders } from "@/lib/site-origin";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ reference: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { reference } = await params;
  return { title: `iyzico ödeme — ${reference}` };
}

export default async function IyzicoCheckoutPage({ params }: PageProps) {
  const { reference } = await params;
  const { order } = await requirePendingCardOrder(reference, "iyzico");
  const settings = await getSettingsMapUncached();
  if (!isIyzicoConfigured(settings)) {
    return (
      <PaymentError
        title="iyzico şu an kullanılamıyor"
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

  const headerStore = await headers();
  const origin = originFromHeaders(headerStore, settings);
  const ip = ipFromRequestHeaders(headerStore);
  const email = order.user.email?.trim();
  if (!email) {
    return (
      <PaymentError title="E-posta gerekli" message="Kart ödemesi için hesap e-postası gerekir." />
    );
  }

  const recovered = await finalizeIyzicoCheckout({
    settings,
    token: order.paymentToken,
    conversationId: order.reference,
  });
  if (recovered.ok) {
    redirect(`/siparis/tesekkur/${recovered.reference}?odeme=ok`);
  }

  switch (recovered.reason) {
    case "in_progress":
      return (
        <PaymentError
          title="Ödeme doğrulanıyor"
          message="3D Secure sonrası ödeme kaydı henüz tamamlanmadı. Yeni bir ödeme başlatmayın; bu sayfayı birkaç saniye sonra yenileyin."
          actionHref={`/odeme/iyzico/${order.reference}`}
          actionLabel="Sayfayı yenile"
        />
      );
    case "declined":
    case "missing":
    case "error":
      return <PaymentError title="Ödeme alınamadı" message={recovered.message} />;
    case "pending":
      break;
    default: {
      const _exhaustive: never = recovered.reason;
      return _exhaustive;
    }
  }

  const result = await initializeIyzicoCheckoutForm({
    settings,
    conversationId: order.reference,
    callbackUrl: `${origin}/api/payments/iyzico/callback?conversationId=${encodeURIComponent(order.reference)}`,
    paidMinor: order.totalMinor,
    buyer: {
      id: order.userId,
      name: shipping.firstName,
      surname: shipping.lastName,
      email,
      identityNumber: billing.taxNumber,
      gsmNumber: shipping.phone,
      registrationAddress: [shipping.line1, shipping.line2].filter(Boolean).join(" "),
      city: shipping.city,
      country: shipping.country,
      zipCode: shipping.postalCode,
      ip,
    },
    shipping: {
      contactName: `${shipping.firstName} ${shipping.lastName}`.trim(),
      city: shipping.city,
      country: shipping.country,
      address: [shipping.line1, shipping.line2].filter(Boolean).join(" "),
      zipCode: shipping.postalCode,
    },
    billing: {
      contactName: `${billing.firstName} ${billing.lastName}`.trim(),
      city: billing.city,
      country: billing.country,
      address: [billing.line1, billing.line2].filter(Boolean).join(" "),
      zipCode: billing.postalCode,
    },
    items: order.items.map((item) => ({
      id: item.variantId || item.productId || item.id,
      name: item.variantTitle ? `${item.title} (${item.variantTitle})` : item.title,
      category: "Ürün",
      priceMinor: item.totalMinor,
    })),
    shippingMinor: order.shippingMinor,
  });

  if (!result.ok) {
    return <PaymentError title="iyzico ödeme formu açılamadı" message={result.error} />;
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { paymentToken: result.token.slice(0, 191) },
  });

  const formHtml = result.checkoutFormContent
    ? restrictIyzicoCheckoutToCard(result.checkoutFormContent)
    : null;

  if (!formHtml) {
    return (
      <PaymentError
        title="iyzico formu alınamadı"
        message="Gömülü kart formu dönmedi. API anahtarlarını ve Checkout Form yetkisini kontrol edin."
      />
    );
  }

  return (
    <section className="border-b border-site-border py-10 sm:py-14">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold tracking-wide text-site-primary uppercase">Ödeme</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-site-fg">Kart ile öde</h1>
        <p className="mt-2 text-sm text-site-muted">
          Sipariş {order.reference} · {formatMinorTry(order.totalMinor)} · 3D Secure ve taksit bu sayfada
        </p>
        <div className="mt-6">
          <IyzicoCheckoutEmbed html={formHtml} />
        </div>
        <p className="mt-4 text-center text-xs text-site-muted">
          Kart bilgileri iyzico altyapısıyla şifreli işlenir; siteden ayrılmazsınız.
        </p>
        <p className="mt-2 text-center">
          <SiteLink href="/odeme?adim=odeme" className="text-sm font-medium text-site-muted hover:text-site-primary">
            Ödeme yöntemine dön
          </SiteLink>
        </p>
      </div>
    </section>
  );
}

function PaymentError({
  title,
  message,
  actionHref = "/odeme?adim=odeme",
  actionLabel = "Ödeme yöntemine dön",
}: {
  title: string;
  message: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <section className="border-b border-site-border py-12 sm:py-16">
      <div className="mx-auto max-w-lg px-4 text-center sm:px-6">
        <h1 className="font-display text-2xl font-bold text-site-fg">{title}</h1>
        <p className="mt-3 text-sm text-site-muted">{message}</p>
        <SiteLink href={actionHref} className="mt-6 inline-block text-sm font-semibold text-site-primary">
          {actionLabel}
        </SiteLink>
      </div>
    </section>
  );
}
