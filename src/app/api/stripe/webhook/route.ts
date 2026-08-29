import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { BillingInterval } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getStripe, mapStripeSubscriptionStatus } from "@/lib/stripe";

export const runtime = "nodejs";

function periodEnd(subscription: Stripe.Subscription) {
  const raw =
    "current_period_end" in subscription
      ? (subscription as Stripe.Subscription & { current_period_end?: number })
          .current_period_end
      : undefined;
  if (typeof raw === "number") return new Date(raw * 1000);
  const itemEnd = subscription.items?.data?.[0]
    ? (subscription.items.data[0] as { current_period_end?: number }).current_period_end
    : undefined;
  if (typeof itemEnd === "number") return new Date(itemEnd * 1000);
  return null;
}

async function syncSubscription(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId;
  const pricingPlanId = subscription.metadata.pricingPlanId;
  const intervalRaw = subscription.metadata.billingInterval;
  const billingInterval =
    intervalRaw === "YEARLY" ? BillingInterval.YEARLY : BillingInterval.MONTHLY;

  if (!userId || !pricingPlanId) {
    console.warn("Stripe subscription missing metadata", subscription.id);
    return;
  }

  const status = mapStripeSubscriptionStatus(subscription.status);
  const priceId =
    typeof subscription.items.data[0]?.price?.id === "string"
      ? subscription.items.data[0].price.id
      : null;

  await prisma.membershipSubscription.upsert({
    where: { stripeSubscriptionId: subscription.id },
    update: {
      status,
      billingInterval,
      stripePriceId: priceId,
      currentPeriodEnd: periodEnd(subscription),
      pricingPlanId,
      userId,
    },
    create: {
      userId,
      pricingPlanId,
      status,
      billingInterval,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      currentPeriodEnd: periodEnd(subscription),
    },
  });
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret yok." }, { status: 500 });
  }

  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "İmza yok." }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error("Stripe webhook signature failed:", error);
    return NextResponse.json({ error: "Geçersiz imza." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "payment" && session.metadata?.kind === "order" && session.metadata.orderId) {
          const orderId = session.metadata.orderId;
          const order = await prisma.order.findUnique({
            where: { id: orderId },
            select: { id: true, totalMinor: true, status: true },
          });
          if (order && order.status === "AWAITING_PAYMENT") {
            await prisma.$transaction([
              prisma.order.update({
                where: { id: order.id },
                data: { status: "PAYMENT_ACCEPTED" },
              }),
              prisma.orderStatusEvent.create({
                data: { orderId: order.id, status: "PAYMENT_ACCEPTED" },
              }),
              prisma.orderPayment.create({
                data: {
                  orderId: order.id,
                  method: "CREDIT_CARD",
                  amountMinor: order.totalMinor,
                  transactionId:
                    typeof session.payment_intent === "string" ? session.payment_intent : session.id,
                },
              }),
            ]);
          }
          break;
        }
        if (session.mode === "subscription" && typeof session.subscription === "string") {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          if (session.metadata) {
            subscription.metadata = {
              ...subscription.metadata,
              ...session.metadata,
            };
          }
          await syncSubscription(subscription);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await syncSubscription(subscription);
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error("Stripe webhook handler failed:", error);
    return NextResponse.json({ error: "İşlenemedi." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
