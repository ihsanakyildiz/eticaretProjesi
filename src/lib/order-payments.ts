import { OrderPaymentMethod, OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function acceptCardPayment(input: {
  orderId: string;
  transactionId: string;
  expectedMinor?: number;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    select: {
      id: true,
      totalMinor: true,
      status: true,
      payments: { select: { id: true, transactionId: true }, take: 8 },
    },
  });
  if (!order) return { ok: false, reason: "Sipariş bulunamadı." };

  if (input.expectedMinor != null && input.expectedMinor !== order.totalMinor) {
    return { ok: false, reason: "Ödeme tutarı sipariş tutarıyla eşleşmiyor." };
  }

  if (order.status === OrderStatus.PAYMENT_ACCEPTED || order.status === OrderStatus.PROCESSING) {
    return { ok: true };
  }
  if (
    order.status !== OrderStatus.AWAITING_PAYMENT &&
    order.status !== OrderStatus.PAYMENT_ERROR
  ) {
    return { ok: false, reason: "Sipariş bu aşamada tahsil edilemez." };
  }

  const duplicate = order.payments.some(
    (row) => row.transactionId && row.transactionId === input.transactionId,
  );
  if (duplicate) return { ok: true };

  await prisma.$transaction([
    prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.PAYMENT_ACCEPTED },
    }),
    prisma.orderStatusEvent.create({
      data: { orderId: order.id, status: OrderStatus.PAYMENT_ACCEPTED },
    }),
    prisma.orderPayment.create({
      data: {
        orderId: order.id,
        method: OrderPaymentMethod.CREDIT_CARD,
        amountMinor: order.totalMinor,
        transactionId: input.transactionId.slice(0, 191),
      },
    }),
  ]);

  return { ok: true };
}

export async function markOrderPaymentError(orderId: string, note?: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true },
  });
  if (!order) return;
  if (order.status !== OrderStatus.AWAITING_PAYMENT) return;

  await prisma.$transaction([
    prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.PAYMENT_ERROR },
    }),
    prisma.orderStatusEvent.create({
      data: {
        orderId: order.id,
        status: OrderStatus.PAYMENT_ERROR,
        note: note?.slice(0, 500) || null,
      },
    }),
  ]);
}
