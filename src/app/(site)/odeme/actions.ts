"use server";

import { OrderAddressKind, OrderPaymentMethod, OrderStatus } from "@prisma/client";
import { revalidatePath, revalidateTag } from "next/cache";
import {
  appendCustomerAddress,
  prepareAddressDrafts,
} from "@/lib/customer-addresses";
import { emptyAddressDraft } from "@/lib/customers";
import { normalizeCartLines, type CartLine } from "@/lib/cart";
import {
  hydrateCart,
  loadCheckoutAddresses,
  loadCheckoutCarriers,
  requireCheckoutUser,
  type CheckoutAddress,
} from "@/lib/checkout";
import {
  checkoutChoiceToOrderPayment,
  parseCheckoutPaymentChoice,
} from "@/lib/checkout-payment-choice";
import { isIyzicoConfigured, isPaytrConfigured } from "@/lib/checkout-payments";
import { ensureOrderDiscountSchema } from "@/lib/ensure-order-discount-schema";
import { orderDiscountSummary, snapshotCompareAtMinor } from "@/lib/order-discount";
import { nextOrderNo, snapshotAddress, uniqueOrderReference } from "@/lib/order-server";
import { reserveOrderStock, StockShortageError } from "@/lib/order-stock";
import { prisma } from "@/lib/prisma";
import { getSettingsMap } from "@/lib/settings";
import { canBypassMaintenance, isMaintenanceMode } from "@/lib/site-access";
import { getSiteOrigin } from "@/lib/site-origin";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export type CheckoutAddressState = {
  error?: string;
  success?: boolean;
  addresses?: CheckoutAddress[];
};

export type PlaceOrderState = {
  error?: string;
  redirectUrl?: string;
};

function read(form: FormData, key: string, max = 255) {
  return String(form.get(key) ?? "").trim().slice(0, max);
}

export async function saveCheckoutAddressAction(
  _prev: CheckoutAddressState,
  formData: FormData,
): Promise<CheckoutAddressState> {
  const session = await requireCheckoutUser();
  if (!session?.user?.id) return { error: "Adres kaydetmek için giriş yapın." };

  const prepared = prepareAddressDrafts(
    JSON.stringify([
      emptyAddressDraft({
        alias: read(formData, "alias", 100) || "Teslimat",
        firstName: read(formData, "firstName", 100),
        lastName: read(formData, "lastName", 100),
        phone: read(formData, "phone", 50),
        line1: read(formData, "line1"),
        line2: read(formData, "line2"),
        country: read(formData, "country", 100) || "Türkiye",
        city: read(formData, "city", 100),
        district: read(formData, "district", 100),
        neighborhood: read(formData, "neighborhood", 150),
        postalCode: read(formData, "postalCode", 20),
        company: read(formData, "company", 191),
        taxOffice: read(formData, "taxOffice", 100),
        taxNumber: read(formData, "taxNumber", 50),
        isDelivery: formData.get("isDelivery") !== "false",
        isInvoice: formData.get("isInvoice") !== "false",
        isCorporateInvoice: formData.get("isCorporateInvoice") === "on",
        isDefaultDelivery: true,
        isDefaultInvoice: true,
      }),
    ]),
  );
  if (prepared.error) return { error: prepared.error };
  const draft = prepared.addresses[0];
  if (!draft) return { error: "Adres bilgilerini doldurun." };

  await prisma.$transaction((tx) => appendCustomerAddress(tx, session.user.id, draft));
  const addresses = await loadCheckoutAddresses(session.user.id);
  revalidatePath("/odeme");
  revalidatePath("/uye/adresler");
  return { success: true, addresses };
}

export async function placeOrderAction(
  _prev: PlaceOrderState,
  formData: FormData,
): Promise<PlaceOrderState> {
  const session = await requireCheckoutUser();
  if (!session?.user?.id) return { error: "Sipariş için giriş yapın." };

  let cartLines: CartLine[] = [];
  try {
    cartLines = normalizeCartLines(JSON.parse(String(formData.get("cartJson") ?? "[]")));
  } catch {
    return { error: "Sepet okunamadı." };
  }

  const cart = await hydrateCart(cartLines);
  const sellable = cart.lines.filter((line) => line.available);
  if (sellable.length === 0) return { error: "Sepetiniz boş veya ürünler satılamıyor." };

  const shippingAddressId = read(formData, "shippingAddressId", 64);
  const billingAddressId = read(formData, "billingAddressId", 64) || shippingAddressId;
  const carrierId = read(formData, "carrierId", 64);
  const choice = parseCheckoutPaymentChoice(String(formData.get("paymentMethod") ?? "BANK_WIRE"));
  const { method: paymentMethod, provider } = checkoutChoiceToOrderPayment(choice);
  const settings = await getSettingsMap().catch(() => ({}) as Record<string, string>);
  if (isMaintenanceMode(settings) && !canBypassMaintenance(session.user.role)) {
    return { error: "Site bakımda olduğu için sipariş alınamıyor." };
  }

  if (provider === "stripe" && !isStripeConfigured()) {
    return { error: "Stripe kart ödemesi şu an kullanılamıyor." };
  }
  if (provider === "iyzico" && !isIyzicoConfigured(settings)) {
    return { error: "iyzico kart ödemesi şu an kullanılamıyor." };
  }
  if (provider === "paytr" && !isPaytrConfigured(settings)) {
    return { error: "PayTR kart ödemesi şu an kullanılamıyor." };
  }

  const addresses = await loadCheckoutAddresses(session.user.id);
  const shipping = addresses.find((row) => row.id === shippingAddressId && row.isDelivery) ??
    addresses.find((row) => row.id === shippingAddressId);
  const billing = addresses.find((row) => row.id === billingAddressId && row.isInvoice) ??
    addresses.find((row) => row.id === billingAddressId) ??
    shipping;
  if (!shipping || !billing) return { error: "Teslimat ve fatura adresi seçin." };

  const carriers = await loadCheckoutCarriers(cart.extraShippingMinor);
  const carrier = carriers.find((row) => row.id === carrierId) ?? carriers[0];
  if (!carrier) return { error: "Kargo seçin." };

  const shippingMinor = carrier.priceMinor;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, role: true },
  });
  if (!user) return { error: "Hesap bulunamadı." };

  try {
    await ensureOrderDiscountSchema().catch(() => undefined);
    const created = await prisma.$transaction(async (tx) => {
      const items = sellable.map((line) => ({
        productId: line.productId,
        variantId: line.variantId,
        title: line.title,
        variantTitle: line.variantTitle,
        sku: line.sku,
        quantity: line.quantity,
        unitPriceMinor: line.unitPriceMinor,
        compareAtMinor: snapshotCompareAtMinor(line.compareAtMinor, line.unitPriceMinor),
        taxRatePercent: line.taxRatePercent,
        totalMinor: line.totalMinor,
        image: line.image,
      }));
      const productsTotal = cart.productsMinor;
      const taxTotal = cart.taxMinor;
      const { discountMinor } = orderDiscountSummary(items);

      const order = await tx.order.create({
        data: {
          orderNo: await nextOrderNo(tx),
          reference: await uniqueOrderReference(tx),
          userId: user.id,
          status: OrderStatus.AWAITING_PAYMENT,
          paymentMethod:
            paymentMethod === "CREDIT_CARD"
              ? OrderPaymentMethod.CREDIT_CARD
              : paymentMethod === "CASH_ON_DELIVERY"
                ? OrderPaymentMethod.CASH_ON_DELIVERY
                : OrderPaymentMethod.BANK_WIRE,
          paymentProvider: provider,
          productsMinor: productsTotal,
          shippingMinor,
          taxMinor: taxTotal,
          discountMinor,
          totalMinor: productsTotal + shippingMinor,
          carrierName: carrier.name,
          items: { create: items },
          addresses: {
            create: [
              snapshotAddress(OrderAddressKind.SHIPPING, shipping),
              snapshotAddress(OrderAddressKind.BILLING, billing),
            ],
          },
          statusHistory: {
            create: { status: OrderStatus.AWAITING_PAYMENT },
          },
        },
      });
      await reserveOrderStock(tx, order.id);
      return order;
    });

    revalidatePath("/admin/orders");
    revalidateTag("products");

    if (provider === "stripe") {
      const origin = getSiteOrigin(settings);
      const stripe = getStripe();
      const checkout = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: user.email ?? undefined,
        metadata: {
          kind: "order",
          orderId: created.id,
          reference: created.reference,
        },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "try",
              unit_amount: created.totalMinor,
              product_data: { name: `Sipariş ${created.reference}` },
            },
          },
        ],
        success_url: `${origin}/siparis/tesekkur/${created.reference}?odeme=ok`,
        cancel_url: `${origin}/odeme?adim=odeme&iptal=1`,
      });
      if (!checkout.url) return { error: "Kart ödemesi başlatılamadı." };
      return { redirectUrl: checkout.url };
    }

    if (provider === "iyzico") {
      return { redirectUrl: `/odeme/iyzico/${created.reference}` };
    }

    if (provider === "paytr") {
      return { redirectUrl: `/odeme/paytr/${created.reference}` };
    }

    if (provider === null) {
      return { redirectUrl: `/siparis/tesekkur/${created.reference}` };
    }

    const _exhaustive: never = provider;
    return _exhaustive;
  } catch (error) {
    if (error instanceof StockShortageError) {
      return { error: `"${error.productTitle}" için yeterli stok kalmadı. Sepeti güncelleyip tekrar deneyin.` };
    }
    console.error(error);
    return { error: "Sipariş kaydedilirken bir hata oluştu." };
  }
}
