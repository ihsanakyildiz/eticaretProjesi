"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { SiteLink } from "@/components/site/site-link";
import { PricingPlanStartCta } from "@/components/site/home/pricing-plan-start-cta";
import type {
  PricingBillingInterval,
  PricingBillingOptions,
  PricingPlanView,
} from "@/lib/pricing";
import { resolvePlanPrice, getPricingPeriodLabel } from "@/lib/pricing";
import { publicPricingPlanHref } from "@/lib/public-urls";
import { resolveMembershipGatedHref } from "@/lib/membership-urls";
import { PricingPlanPrice } from "@/components/site/pricing/pricing-plan-price";

const FALLBACK_PLANS: PricingPlanView[] = [
  {
    id: "trial",
    name: "Deneme",
    slug: "deneme",
    blurb: "Test ve keşif için",
    detailContent: null,
    coverImage: null,
    priceMonthly: "Ücretsiz",
    priceYearly: "Ücretsiz",
    priceType: "FIXED",
    priceRangeMin: null,
    priceRangeMax: null,
    priceMonthlyDiscount: null,
    priceYearlyDiscount: null,
    showPeriod: false,
    featured: false,
    features: [
      { label: "Tek ekip üyesi", included: true },
      { label: "Temel UI blokları", included: true },
      { label: "10 GB depolama", included: true },
      { label: "Özel e-posta hesabı", included: false },
      { label: "Öncelikli destek", included: false },
    ],
    ctaLabel: "Başlayın",
    ctaHref: "/iletisim",
    purchasable: false,
    stripePriceIdMonthly: null,
    stripePriceIdYearly: null,
  },
  {
    id: "standard",
    name: "Standart",
    slug: "standart",
    blurb: "Büyüyen ekipler için",
    detailContent: null,
    coverImage: null,
    priceMonthly: "₺14.900",
    priceYearly: "₺149.000",
    priceType: "FIXED" as const,
    priceRangeMin: null,
    priceRangeMax: null,
    priceMonthlyDiscount: null,
    priceYearlyDiscount: null,
    showPeriod: true,
    featured: true,
    features: [
      { label: "5 ekip üyesi", included: true },
      { label: "Tüm medya kanalları", included: true },
      { label: "Gelişmiş CRM özellikleri", included: true },
      { label: "15.000 kişiye kadar", included: true },
      { label: "7/24 destek", included: true },
    ],
    ctaLabel: "Başlayın",
    ctaHref: "/iletisim",
    purchasable: false,
    stripePriceIdMonthly: null,
    stripePriceIdYearly: null,
  },
  {
    id: "business",
    name: "Kurumsal",
    slug: "kurumsal",
    blurb: "İleri seviye projeler",
    detailContent: null,
    coverImage: null,
    priceMonthly: "₺24.900",
    priceYearly: "₺249.000",
    priceType: "QUOTE" as const,
    priceRangeMin: null,
    priceRangeMax: null,
    priceMonthlyDiscount: null,
    priceYearlyDiscount: null,
    showPeriod: true,
    featured: false,
    features: [
      { label: "50 ekip üyesi", included: true },
      { label: "Geniş UI kütüphanesi", included: true },
      { label: "100 GB depolama", included: true },
      { label: "Özel e-posta hesabı", included: true },
      { label: "Öncelikli destek", included: true },
    ],
    ctaLabel: "Başlayın",
    ctaHref: "/iletisim",
    purchasable: false,
    stripePriceIdMonthly: null,
    stripePriceIdYearly: null,
  },
];

const DEFAULT_BILLING: PricingBillingOptions = {
  mode: "project",
  monthlyEnabled: false,
  yearlyEnabled: false,
  showToggle: false,
  defaultInterval: "monthly",
};

export type HomePricingCta = {
  label?: string | null;
  url?: string | null;
};

export function HomePricing({
  title,
  subtitle,
  plans,
  primaryCta,
  secondaryCta,
  purchaseEnabled = false,
  membershipEnabled = false,
  isAuthenticated = false,
  billingOptions = DEFAULT_BILLING,
}: {
  title?: string | null;
  subtitle?: string | null;
  plans?: PricingPlanView[];
  primaryCta?: HomePricingCta;
  secondaryCta?: HomePricingCta;
  purchaseEnabled?: boolean;
  membershipEnabled?: boolean;
  isAuthenticated?: boolean;
  billingOptions?: PricingBillingOptions;
} = {}) {
  const [billing, setBilling] = useState<PricingBillingInterval>(
    billingOptions.defaultInterval,
  );
  const heading =
    title?.trim() || "Şeffaf proje fiyatlandırması";
  const lead =
    subtitle?.trim() ||
    (billingOptions.mode === "project"
      ? "Tek seferlik proje bedeli — seçtiğiniz domain ve hostinge kurulum, kaynak kod teslimi dahil."
      : null);
  const list = plans && plans.length > 0 ? plans : FALLBACK_PLANS;

  const primaryLabel = primaryCta?.label?.trim() || "Ücretsiz Teklif Alın";
  const primaryUrl = resolveMembershipGatedHref({
    membershipEnabled,
    isAuthenticated,
    destination: primaryCta?.url?.trim() || "/iletisim",
  });
  const secondaryLabel = secondaryCta?.label?.trim() || "Nasıl çalışıyoruz?";
  const secondaryUrl = secondaryCta?.url?.trim() || "/hakkimizda";

  const activeBilling = billingOptions.showToggle
    ? billing
    : billingOptions.defaultInterval;
  const periodLabel = getPricingPeriodLabel(billingOptions);

  return (
    <section className="relative overflow-hidden py-20">
      <div className="pointer-events-none absolute inset-0 site-soft-glow opacity-50" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-site-fg sm:text-4xl">
            {heading}
          </h2>
          {lead ? <p className="mt-3 text-site-muted">{lead}</p> : null}
          {billingOptions.showToggle ? (
            <div className="mt-6 inline-flex rounded-full border border-site-border bg-site-card p-1">
              <button
                type="button"
                onClick={() => setBilling("monthly")}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  billing === "monthly"
                    ? "bg-site-primary text-white"
                    : "text-site-muted hover:text-site-fg"
                }`}
              >
                Aylık
              </button>
              <button
                type="button"
                onClick={() => setBilling("yearly")}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  billing === "yearly"
                    ? "bg-site-primary text-white"
                    : "text-site-muted hover:text-site-fg"
                }`}
              >
                Yıllık
              </button>
            </div>
          ) : billingOptions.mode === "project" ? (
            <p className="mt-4 text-sm text-site-muted">
              Tüm fiyatlar tek seferlik proje bedelidir. Sosyal medya, dijital
              pazarlama ve e-ticaret danışmanlığı isteğe bağlı devam hizmeti
              olarak ayrıca sunulur.
            </p>
          ) : null}
        </div>

        <div className="mt-12 grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((plan) => {
            const resolved = resolvePlanPrice(
              plan,
              activeBilling,
              billingOptions.mode,
            );
            return (
              <article
                key={plan.id}
                className={`rounded-[1.75rem] border p-7 shadow-sm transition ${
                  plan.featured
                    ? "border-transparent bg-site-primary text-white shadow-xl shadow-violet-500/25 lg:-translate-y-2"
                    : "border-site-border bg-site-card text-site-fg"
                }`}
              >
                <h3 className="text-xl font-bold">{plan.name}</h3>
                {plan.blurb ? (
                  <p
                    className={`mt-1 text-sm ${
                      plan.featured ? "text-white/80" : "text-site-muted"
                    }`}
                  >
                    {plan.blurb}
                  </p>
                ) : null}
                <div className="mt-6">
                  <PricingPlanPrice
                    resolved={resolved}
                    showPeriod={plan.showPeriod}
                    periodLabel={periodLabel}
                    tone={plan.featured ? "featured" : "default"}
                  />
                </div>

                <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                  <SiteLink
                    href={publicPricingPlanHref(plan.slug)}
                    className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition ${
                      plan.featured
                        ? "border border-white/40 text-white hover:bg-white/10"
                        : "border border-site-fg/20 text-site-fg hover:border-site-primary hover:text-site-primary"
                    }`}
                  >
                    Detay
                  </SiteLink>
                  <PricingPlanStartCta
                    plan={plan}
                    billing={activeBilling}
                    purchaseEnabled={purchaseEnabled}
                    membershipEnabled={membershipEnabled}
                    isAuthenticated={isAuthenticated}
                    featured={plan.featured}
                    className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition ${
                      plan.featured
                        ? "bg-white text-site-primary hover:bg-violet-50"
                        : "bg-site-primary text-white hover:opacity-90"
                    }`}
                  />
                </div>

                <ul className="mt-7 space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature.label}
                      className={`flex items-center gap-2.5 text-sm ${
                        feature.included
                          ? plan.featured
                            ? "text-white"
                            : "text-site-fg"
                          : plan.featured
                            ? "text-white/40"
                            : "text-site-muted/50"
                      }`}
                    >
                      <Check
                        className={`h-4 w-4 ${
                          feature.included
                            ? plan.featured
                              ? "text-white"
                              : "text-site-primary"
                            : "opacity-40"
                        }`}
                      />
                      {feature.label}
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <SiteLink
            href={primaryUrl}
            className="inline-flex items-center gap-2 rounded-full bg-site-primary px-5 py-3 text-sm font-semibold text-white"
          >
            {primaryLabel}
            <ArrowRight className="h-4 w-4" />
          </SiteLink>
          <SiteLink
            href={secondaryUrl}
            className="text-sm font-semibold text-site-fg underline underline-offset-4"
          >
            {secondaryLabel}
          </SiteLink>
        </div>
      </div>
    </section>
  );
}
