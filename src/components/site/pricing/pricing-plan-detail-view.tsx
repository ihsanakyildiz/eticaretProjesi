"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { SiteImage } from "@/components/site/site-image";
import { PricingPlanStartCta } from "@/components/site/home/pricing-plan-start-cta";
import type {
  PricingBillingInterval,
  PricingBillingOptions,
  PricingPlanView,
} from "@/lib/pricing";
import { resolvePlanPrice, getPricingPeriodLabel } from "@/lib/pricing";
import { PricingPlanPrice } from "@/components/site/pricing/pricing-plan-price";

export function PricingPlanDetailView({
  plan,
  contentHtml,
  coverImage,
  purchaseEnabled = false,
  membershipEnabled = false,
  isAuthenticated = false,
  billingOptions,
}: {
  plan: PricingPlanView;
  contentHtml: string;
  coverImage?: string | null;
  purchaseEnabled?: boolean;
  membershipEnabled?: boolean;
  isAuthenticated?: boolean;
  billingOptions: PricingBillingOptions;
}) {
  const [billing, setBilling] = useState<PricingBillingInterval>(
    billingOptions.defaultInterval,
  );
  const activeBilling = billingOptions.showToggle
    ? billing
    : billingOptions.defaultInterval;
  const resolved = resolvePlanPrice(
    plan,
    activeBilling,
    billingOptions.mode,
  );
  const periodLabel = getPricingPeriodLabel(billingOptions);
  const heroImage = coverImage || plan.coverImage;
  const ctaClass =
    "inline-flex items-center justify-center gap-2 rounded-full bg-site-primary px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-site-primary/25 transition hover:opacity-95 disabled:opacity-70";

  return (
    <>
      <section className="relative isolate min-h-[min(78vh,42rem)] overflow-hidden">
        {heroImage ? (
          <SiteImage
            src={heroImage}
            alt={plan.name}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        ) : (
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,color-mix(in_srgb,var(--site-primary)_35%,transparent),transparent_55%),radial-gradient(ellipse_at_80%_10%,color-mix(in_srgb,var(--site-fg)_18%,transparent),transparent_50%),linear-gradient(160deg,var(--site-surface)_0%,color-mix(in_srgb,var(--site-primary)_12%,var(--site-bg))_100%)]"
          />
        )}
        <div
          aria-hidden
          className={`absolute inset-0 ${
            heroImage
              ? "bg-gradient-to-r from-black/75 via-black/55 to-black/25"
              : "bg-gradient-to-r from-site-bg/80 via-site-bg/40 to-transparent"
          }`}
        />
        <div className="relative mx-auto flex min-h-[min(78vh,42rem)] max-w-7xl flex-col justify-end px-4 pb-14 pt-28 sm:px-6 sm:pb-16 lg:px-8 lg:pb-20">
          <div className="site-animate-fade-up max-w-2xl">
            <p
              className={`text-xs font-semibold tracking-[0.2em] uppercase ${
                heroImage ? "text-white/70" : "text-site-primary"
              }`}
            >
              Paket
            </p>
            <h1
              className={`mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl ${
                heroImage ? "text-white" : "text-site-fg"
              }`}
            >
              {plan.name}
            </h1>
            {plan.blurb ? (
              <p
                className={`mt-4 max-w-xl text-base leading-relaxed sm:text-lg ${
                  heroImage ? "text-white/85" : "text-site-muted"
                }`}
              >
                {plan.blurb}
              </p>
            ) : null}

            <div className="mt-8 flex flex-wrap items-end gap-5">
              <PricingPlanPrice
                resolved={resolved}
                showPeriod={plan.showPeriod}
                periodLabel={periodLabel}
                size="xl"
                tone={heroImage ? "onDark" : "default"}
              />
              {billingOptions.showToggle ? (
                <div
                  className={`inline-flex rounded-full p-1 ${
                    heroImage
                      ? "border border-white/25 bg-white/10 backdrop-blur-sm"
                      : "border border-site-border bg-site-card"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setBilling("monthly")}
                    className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                      billing === "monthly"
                        ? heroImage
                          ? "bg-white text-site-fg"
                          : "bg-site-primary text-white"
                        : heroImage
                          ? "text-white/80 hover:text-white"
                          : "text-site-muted hover:text-site-fg"
                    }`}
                  >
                    Aylık
                  </button>
                  <button
                    type="button"
                    onClick={() => setBilling("yearly")}
                    className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                      billing === "yearly"
                        ? heroImage
                          ? "bg-white text-site-fg"
                          : "bg-site-primary text-white"
                        : heroImage
                          ? "text-white/80 hover:text-white"
                          : "text-site-muted hover:text-site-fg"
                    }`}
                  >
                    Yıllık
                  </button>
                </div>
              ) : billingOptions.mode === "project" ? (
                <p
                  className={`max-w-md text-sm leading-relaxed ${
                    heroImage ? "text-white/75" : "text-site-muted"
                  }`}
                >
                  Tek seferlik proje bedeli — domain &amp; hostinge kurulum,
                  kaynak kod teslimi dahil.
                </p>
              ) : null}
            </div>

            <div className="mt-8">
              <PricingPlanStartCta
                plan={plan}
                billing={activeBilling}
                purchaseEnabled={purchaseEnabled}
                membershipEnabled={membershipEnabled}
                isAuthenticated={isAuthenticated}
                className={ctaClass}
              />
            </div>
          </div>
        </div>
      </section>

      {plan.features.length > 0 ? (
        <section className="border-b border-site-border bg-site-surface py-14 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <h2 className="font-display text-2xl font-bold tracking-tight text-site-fg sm:text-3xl">
                Neler dahil?
              </h2>
              <p className="mt-2 text-site-muted">
                Bu paketin sunduğu başlıca özellikler. Devam hizmetleri
                (sosyal medya, dijital pazarlama, danışmanlık) isteğe bağlıdır.
              </p>
            </div>
            <ul className="mt-10 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              {plan.features.map((feature) => (
                <li
                  key={feature.label}
                  className={`flex items-center gap-3 text-sm ${
                    feature.included
                      ? "text-site-fg"
                      : "text-site-muted/45"
                  }`}
                >
                  <Check
                    className={`h-4 w-4 shrink-0 ${
                      feature.included
                        ? "text-site-primary"
                        : "opacity-40"
                    }`}
                  />
                  {feature.label}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section className="py-14 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-bold tracking-tight text-site-fg sm:text-3xl">
            Paket hakkında
          </h2>
          {contentHtml ? (
            <div
              className="site-rich-content mt-8"
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />
          ) : (
            <p className="mt-6 text-site-muted">
              Bu paket için henüz ayrıntılı açıklama eklenmemiş.
            </p>
          )}
        </div>
      </section>

      <section className="relative overflow-hidden border-t border-site-border bg-site-surface py-14 sm:py-16">
        <div className="pointer-events-none absolute inset-0 site-soft-glow opacity-40" />
        <div className="relative mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-site-fg">
              {plan.name} ile başlayın
            </h2>
            <p className="mt-2 text-site-muted">
              {resolved.compareAt ? (
                <>
                  <span className="line-through opacity-70">
                    {resolved.compareAt}
                  </span>{" "}
                </>
              ) : null}
              <span className="font-semibold text-site-fg">{resolved.price}</span>
              {plan.showPeriod ? ` / ${periodLabel}` : null}
              {plan.blurb ? ` · ${plan.blurb}` : null}
            </p>
          </div>
          <PricingPlanStartCta
            plan={plan}
            billing={activeBilling}
            purchaseEnabled={purchaseEnabled}
            membershipEnabled={membershipEnabled}
            isAuthenticated={isAuthenticated}
            className={ctaClass}
          />
        </div>
      </section>
    </>
  );
}
