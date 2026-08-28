import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { auth } from "@/auth";
import { getMembershipFlags } from "@/lib/membership";
import { prisma } from "@/lib/prisma";
import { getSettingsMap } from "@/lib/settings";
import { getSiteOrigin } from "@/lib/site-origin";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST() {
  try {
    const flags = await getMembershipFlags();
    if (!flags.enabled || !flags.stripeEnabled || !isStripeConfigured()) {
      return NextResponse.json({ error: "Ödeme kapalı." }, { status: 403 });
    }

    const session = await auth();
    if (!session?.user?.id || session.user.role === Role.ADMIN) {
      return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user?.stripeCustomerId) {
      return NextResponse.json({ error: "Stripe müşteri kaydı yok." }, { status: 400 });
    }

    const settings = await getSettingsMap();
    const origin = getSiteOrigin(settings);
    const stripe = getStripe();
    const portal = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${origin}/uye/abonelikler`,
    });

    return NextResponse.json({ url: portal.url });
  } catch (error) {
    console.error("Stripe portal error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Portal açılamadı." },
      { status: 500 },
    );
  }
}
