import "server-only";

import { notFound, redirect } from "next/navigation";
import { OrderPaymentMethod, OrderStatus } from "@prisma/client";
import { requireCheckoutUser } from "@/lib/checkout";
import {
  parseOrderPaymentProvider,
  type OrderPaymentProvider,
} from "@/lib/checkout-payment-choice";
import { prisma } from "@/lib/prisma";

export async function requirePendingCardOrder(reference: string, provider: OrderPaymentProvider) {
  const session = await requireCheckoutUser();
  if (!session?.user?.id) {
    redirect(`/giris?callbackUrl=${encodeURIComponent(`/odeme/${provider}/${reference}`)}`);
  }

  const order = await prisma.order.findUnique({
    where: { reference },
    include: {
      items: true,
      addresses: true,
      user: { select: { id: true, email: true } },
    },
  });
  if (!order || order.userId !== session.user.id) notFound();
  if (order.paymentMethod !== OrderPaymentMethod.CREDIT_CARD) notFound();
  if (parseOrderPaymentProvider(order.paymentProvider) !== provider) notFound();

  if (order.status === OrderStatus.PAYMENT_ACCEPTED || order.status === OrderStatus.PROCESSING) {
    redirect(`/siparis/tesekkur/${order.reference}?odeme=ok`);
  }

  return { session, order };
}
