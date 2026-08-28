import { NextResponse } from "next/server";
import { BillingInterval, Role } from "@prisma/client";
import { auth } from "@/auth";
import { getMembershipFlags } from "@/lib/membership";
import { membershipLoginHref } from "@/lib/membership-urls";
import { prisma } from "@/lib/prisma";
import { getSettingsMap } from "@/lib/settings";
import { getSiteOrigin } from "@/lib/site-origin";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { publicPricingPlanHref } from "@/lib/public-urls";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const flags = await getMembershipFlags();
    if (!flags.enabled || !flags.stripeEnabled || !isStripeConfigured()) {
      return NextResponse.json({ error: "Ödeme şu an kapalı." }, { status: 403 });
    }

    const session = await auth();
    if (!session?.user?.id || session.user.role === Role.ADMIN) {
      const bodyPreview = (await request
        .clone()
        .json()
        .catch(() => null)) as { pricingPlanId?: string } | null;
      const planId = String(bodyPreview?.pricingPlanId ?? "").trim();
      let callbackUrl = "/uye/abonelikler";
      if (planId) {
        const plan = await prisma.pricingPlan.findFirst({
          where: { id: planId, isActive: true },
          select: { slug: true },
        });
        if (plan?.slug) callbackUrl = publicPricingPlanHref(plan.slug);
      }
      return NextResponse.json(
        {
          error: "Satın alma için üye girişi gerekli.",
          loginUrl: membershipLoginHref(callbackUrl),
        },
        { status: 401 },
      );
    }

    const body = (await request.json()) as {
      pricingPlanId?: string;
      interval?: "MONTHLY" | "YEARLY";
    };

    const pricingPlanId = String(body.pricingPlanId ?? "").trim();
    const interval =
      body.interval === "YEARLY" ? BillingInterval.YEARLY : BillingInterval.MONTHLY;

    if (!pricingPlanId) {
      return NextResponse.json({ error: "Paket seçilmedi." }, { status: 400 });
    }

    const plan = await prisma.pricingPlan.findFirst({
      where: {
        id: pricingPlanId,
        isActive: true,
        purchasable: true,
        priceType: "FIXED",
      },
    });

    if (!plan) {
      return NextResponse.json(
        { error: "Bu paket için online ödeme kullanılamaz." },
        { status: 403 },
      );
    }

    const priceId =
      interval === BillingInterval.YEARLY
        ? plan.stripePriceIdYearly
        : plan.stripePriceIdMonthly;

    if (!priceId) {
      return NextResponse.json(
        { error: "Bu paket için Stripe fiyat kimliği tanımlı değil." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user || !user.isActive) {
      return NextResponse.json({ error: "Hesap bulunamadı." }, { status: 404 });
    }

    const stripe = getStripe();
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name ?? undefined,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const settings = await getSettingsMap();
    const origin = getSiteOrigin(settings);

    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/uye/abonelikler?success=1`,
      cancel_url: `${origin}/uye/abonelikler?canceled=1`,
      metadata: {
        userId: user.id,
        pricingPlanId: plan.id,
        billingInterval: interval,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          pricingPlanId: plan.id,
          billingInterval: interval,
        },
      },
    });

    if (!checkout.url) {
      return NextResponse.json({ error: "Checkout oturumu oluşturulamadı." }, { status: 500 });
    }

    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ödeme başlatılamadı." },
      { status: 500 },
    );
  }
}
