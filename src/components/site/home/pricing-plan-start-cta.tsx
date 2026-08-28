"use client";

import { ArrowRight } from "lucide-react";
import { SiteLink } from "@/components/site/site-link";
import { PricingPurchaseButton } from "@/components/site/home/pricing-purchase-button";
import { resolveMembershipGatedHref } from "@/lib/membership-urls";
import type {
  PricingBillingInterval,
  PricingPlanView,
} from "@/lib/pricing";
import { canPurchasePricingPlan } from "@/lib/pricing";
import { publicPricingPlanHref } from "@/lib/public-urls";

export function PricingPlanStartCta({
  plan,
  billing,
  purchaseEnabled,
  membershipEnabled = false,
  isAuthenticated = false,
  featured,
  className,
}: {
  plan: PricingPlanView;
  billing: PricingBillingInterval;
  purchaseEnabled: boolean;
  membershipEnabled?: boolean;
  isAuthenticated?: boolean;
  featured?: boolean;
  className?: string;
}) {
  const canPurchase =
    purchaseEnabled &&
    canPurchasePricingPlan(plan) &&
    ((billing === "monthly" && plan.stripePriceIdMonthly) ||
      (billing === "yearly" && plan.stripePriceIdYearly));

  const destination = canPurchase
    ? publicPricingPlanHref(plan.slug)
    : plan.ctaHref || "/iletisim";

  const href = resolveMembershipGatedHref({
    membershipEnabled,
    isAuthenticated,
    destination,
  });

  const needsAuth = membershipEnabled && !isAuthenticated;

  if (canPurchase && !needsAuth) {
    return (
      <PricingPurchaseButton
        planId={plan.id}
        interval={billing}
        label={plan.ctaLabel || "Başlayın"}
        featured={featured}
        enabled
        className={className}
      />
    );
  }

  return (
    <SiteLink
      href={href}
      className={
        className ||
        `inline-flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition ${
          featured
            ? "bg-white text-site-primary hover:bg-violet-50"
            : "border border-site-fg/20 text-site-fg hover:border-site-primary hover:text-site-primary"
        }`
      }
    >
      {plan.ctaLabel || "Başlayın"}
      <ArrowRight className="h-4 w-4" />
    </SiteLink>
  );
}
