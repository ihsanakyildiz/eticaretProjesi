import "server-only";

import { OrderStatus } from "@prisma/client";
import { parseOrderPaymentProvider } from "@/lib/checkout-payment-choice";
import { refundIyzicoPayment } from "@/lib/iyzico";
import { goodsHaveLeftWarehouse } from "@/lib/order-cases";
import { parseOrderStatus } from "@/lib/orders";
import { releaseOrderStock } from "@/lib/order-stock";
import { prisma } from "@/lib/prisma";
import { refundPaytrPayment } from "@/lib/paytr";
import { getSettingsMapUncached } from "@/lib/settings";
import { getStripe } from "@/lib/stripe";

export function refundedTotalMinor(refunds: { amountMinor: number }[]): number {
  return refunds.reduce((sum, row) => sum + Math.max(0, row.amountMinor), 0);
}

export function paidTotalMinor(payments: { amountMinor: number }[]): number {
  return payments.reduce((sum, row) => sum + Math.max(0, row.amountMinor), 0);
}

function isSameIstanbulDay(left: Date, right: Date): boolean {
  const format = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return format.format(left) === format.format(right);
}

async function refundStripePayment(paymentIntentId: string, amountMinor: number) {
  try {
    const refund = await getStripe().refunds.create({
      payment_intent: paymentIntentId,
      amount: amountMinor,
    });
    if (refund.status === "failed" || refund.status === "canceled") {
      return { ok: false as const, error: "Stripe iadesi başarısız." };
    }
    return { ok: true as const, refundedMinor: refund.amount ?? amountMinor, transactionId: refund.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stripe iadesi başarısız.";
    return { ok: false as const, error: message };
  }
}

export async function executeOrderRefund(input: {
  orderId: string;
  amountMinor: number;
  note?: string | null;
  ip: string;
  caseId?: string | null;
  restock?: boolean;
  allowAfterShipment?: boolean;
  orderStatusOnFullRefund?: OrderStatus;
}): Promise<{ ok: true; refundedMinor: number; fullyRefunded: boolean } | { ok: false; error: string }> {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    select: {
      id: true,
      reference: true,
      status: true,
      paymentProvider: true,
      payments: { select: { amountMinor: true, transactionId: true, paidAt: true }, orderBy: { paidAt: "asc" } },
      refunds: { select: { amountMinor: true } },
    },
  });
  if (!order) return { ok: false, error: "Sipariş bulunamadı." };
  if (order.status === OrderStatus.CANCELED) {
    return { ok: false, error: "İptal edilmiş sipariş iade edilemez." };
  }

  const shipped = goodsHaveLeftWarehouse(parseOrderStatus(order.status));
  if (shipped && !input.allowAfterShipment) {
    return {
      ok: false,
      error:
        "Kargoya verilmiş veya teslim edilmiş siparişte doğrudan ödeme iadesi yapılamaz. Ürün depoya gelip kontrol edilmeden para gönderilmez.",
    };
  }

  const paidMinor = paidTotalMinor(order.payments);
  const alreadyRefunded = refundedTotalMinor(order.refunds);
  const remainingMinor = Math.max(0, paidMinor - alreadyRefunded);
  if (remainingMinor <= 0) return { ok: false, error: "İade edilecek tahsilat kalmadı." };
  if (input.amountMinor <= 0) return { ok: false, error: "İade tutarı geçersiz." };
  if (input.amountMinor > remainingMinor) {
    return { ok: false, error: "İade tutarı kalan tahsilatı aşıyor." };
  }

  const restock = input.restock ?? !shipped;
  const nextStatus = input.orderStatusOnFullRefund ?? OrderStatus.REFUNDED;

  const provider = parseOrderPaymentProvider(order.paymentProvider);
  const charge =
    [...order.payments].reverse().find((row) => row.transactionId && row.amountMinor > 0) ??
    order.payments.find((row) => row.amountMinor > 0);
  const transactionId = charge?.transactionId?.trim() || null;
  const note = input.note?.trim().slice(0, 500) || null;
  const preferCancel = Boolean(
    charge &&
      input.amountMinor === remainingMinor &&
      alreadyRefunded === 0 &&
      isSameIstanbulDay(charge.paidAt, new Date()),
  );

  let refundedMinor = 0;
  let providerTxn: string | null = transactionId;
  const settings = await getSettingsMapUncached();

  if (provider === "iyzico") {
    if (!transactionId) return { ok: false, error: "iyzico ödeme numarası bulunamadı." };
    const result = await refundIyzicoPayment({
      settings,
      paymentId: transactionId,
      conversationId: order.reference,
      amountMinor: input.amountMinor,
      ip: input.ip,
      note,
      preferCancel,
    });
    if (!result.ok) return result;
    refundedMinor = result.refundedMinor;
  } else if (provider === "stripe") {
    if (!transactionId) return { ok: false, error: "Stripe ödeme numarası bulunamadı." };
    const result = await refundStripePayment(transactionId, input.amountMinor);
    if (!result.ok) return result;
    refundedMinor = result.refundedMinor;
    providerTxn = result.transactionId;
  } else if (provider === "paytr") {
    if (!transactionId) return { ok: false, error: "PayTR sipariş numarası bulunamadı." };
    const result = await refundPaytrPayment({
      settings,
      merchantOid: transactionId,
      amountMinor: input.amountMinor,
    });
    if (!result.ok) return result;
    refundedMinor = result.refundedMinor;
  } else if (provider === null) {
    refundedMinor = input.amountMinor;
  } else {
    const _exhaustive: never = provider;
    return _exhaustive;
  }

  if (refundedMinor <= 0) return { ok: false, error: "İade tutarı işlenemedi." };

  const nextRefunded = alreadyRefunded + refundedMinor;
  const fullyRefunded = nextRefunded >= paidMinor;

  await prisma.$transaction(async (tx) => {
    await tx.orderRefund.create({
      data: {
        orderId: order.id,
        caseId: input.caseId ?? null,
        amountMinor: refundedMinor,
        provider,
        transactionId: providerTxn,
        note,
      },
    });
    if (fullyRefunded) {
      if (restock) {
        await releaseOrderStock(tx, order.id);
      }
      await tx.order.update({
        where: { id: order.id },
        data: { status: nextStatus },
      });
      await tx.orderStatusEvent.create({
        data: {
          orderId: order.id,
          status: nextStatus,
          note: note || `İade ${refundedMinor} kuruş`,
        },
      });
      return;
    }
    await tx.orderStatusEvent.create({
      data: {
        orderId: order.id,
        status: order.status,
        note: `Kısmi iade: ${(refundedMinor / 100).toFixed(2)} TL${note ? ` · ${note}` : ""}`.slice(0, 500),
      },
    });
  });

  return { ok: true, refundedMinor, fullyRefunded };
}
