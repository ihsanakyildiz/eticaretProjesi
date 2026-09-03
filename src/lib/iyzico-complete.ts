import "server-only";

import {
  isIyzicoPaymentApproved,
  isIyzicoPaymentDeclined,
  retrieveIyzicoCheckoutFormWithRetry,
  retrieveIyzicoPaymentByConversationId,
} from "@/lib/iyzico";
import { acceptCardPayment, markOrderPaymentError } from "@/lib/order-payments";
import { prisma } from "@/lib/prisma";

export type FinalizeIyzicoResult =
  | { ok: true; reference: string }
  | {
      ok: false;
      reason: "pending" | "in_progress" | "declined" | "missing" | "error";
      message: string;
    };

const orderSelect = {
  id: true,
  reference: true,
  totalMinor: true,
  paymentProvider: true,
} as const;

async function findIyzicoOrder(conversationId: string | null, token: string | null) {
  if (conversationId) {
    const byReference = await prisma.order.findUnique({
      where: { reference: conversationId },
      select: orderSelect,
    });
    if (byReference?.paymentProvider === "iyzico") return byReference;
  }

  if (token) {
    const byToken = await prisma.order.findFirst({
      where: { paymentToken: token, paymentProvider: "iyzico" },
      select: orderSelect,
    });
    if (byToken) return byToken;
  }

  return null;
}

export async function finalizeIyzicoCheckout(input: {
  settings: Record<string, string>;
  token?: string | null;
  conversationId?: string | null;
}): Promise<FinalizeIyzicoResult> {
  const token = input.token?.trim() || null;
  const conversationId = input.conversationId?.trim() || null;

  const fromToken = token
    ? await retrieveIyzicoCheckoutFormWithRetry({
        settings: input.settings,
        token,
        conversationId: conversationId || undefined,
      })
    : null;

  const fromPayment =
    conversationId && (!fromToken || !fromToken.ok || !isIyzicoPaymentApproved(fromToken))
      ? await retrieveIyzicoPaymentByConversationId({
          settings: input.settings,
          conversationId,
        })
      : null;

  const retrieved =
    fromToken?.ok && isIyzicoPaymentApproved(fromToken)
      ? fromToken
      : fromPayment?.ok
        ? fromPayment
        : fromToken;

  if (!retrieved || !retrieved.ok) {
    const retrieveError =
      retrieved && !retrieved.ok
        ? retrieved.error
        : fromPayment && !fromPayment.ok
          ? fromPayment.error
          : "iyzico ödeme sonucu alınamadı.";
    return {
      ok: false,
      reason: "pending",
      message: retrieveError,
    };
  }

  const order = await findIyzicoOrder(retrieved.conversationId ?? conversationId, token);
  if (!order) {
    return { ok: false, reason: "missing", message: "Sipariş bulunamadı." };
  }

  if (isIyzicoPaymentDeclined(retrieved)) {
    await markOrderPaymentError(order.id, retrieved.paymentStatus || "iyzico ödeme başarısız");
    return { ok: false, reason: "declined", message: retrieved.paymentStatus || "Ödeme reddedildi." };
  }

  if (!isIyzicoPaymentApproved(retrieved)) {
    return { ok: false, reason: "in_progress", message: "Ödeme henüz onaylanmadı." };
  }

  if (retrieved.paidPriceMinor != null && retrieved.paidPriceMinor < order.totalMinor) {
    await markOrderPaymentError(order.id, "iyzico tutar uyuşmazlığı");
    return { ok: false, reason: "declined", message: "Ödeme tutarı sipariş tutarıyla eşleşmiyor." };
  }

  const accepted = await acceptCardPayment({
    orderId: order.id,
    transactionId: retrieved.paymentId || token || order.reference,
    expectedMinor: order.totalMinor,
  });
  if (!accepted.ok) {
    return { ok: false, reason: "error", message: accepted.reason };
  }

  return { ok: true, reference: order.reference };
}
