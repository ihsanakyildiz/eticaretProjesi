import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ensurePricingPlansTable } from "@/lib/ensure-pricing-schema";
import { parsePricingFeatures } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import { PricingPlanForm } from "../../pricing-plan-form";

type EditPricingPlanPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: EditPricingPlanPageProps): Promise<Metadata> {
  const { id } = await params;
  const plan = await prisma.pricingPlan.findUnique({
    where: { id },
    select: { name: true },
  });
  return { title: plan ? `Düzenle: ${plan.name}` : "Paket Düzenle" };
}

export default async function EditPricingPlanPage({
  params,
}: EditPricingPlanPageProps) {
  const { id } = await params;
  await ensurePricingPlansTable();
  const plan = await prisma.pricingPlan.findUnique({ where: { id } });
  if (!plan) notFound();

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
          Fiyatlandırma
        </p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">
          Paketi Düzenle
        </h1>
        <p className="mt-2 text-sm text-slate-500">{plan.name}</p>
      </div>
      <PricingPlanForm
        mode="edit"
        initial={{
          id: plan.id,
          name: plan.name,
          slug: plan.slug ?? "",
          blurb: plan.blurb,
          detailContent: plan.detailContent ?? "",
          coverImage: plan.coverImage ?? "",
          priceType: plan.priceType,
          priceRangeMin: plan.priceRangeMin ?? "",
          priceRangeMax: plan.priceRangeMax ?? "",
          priceMonthly: plan.priceMonthly,
          priceYearly: plan.priceYearly,
          priceMonthlyDiscount: plan.priceMonthlyDiscount ?? "",
          priceYearlyDiscount: plan.priceYearlyDiscount ?? "",
          showPeriod: plan.showPeriod,
          featured: plan.featured,
          features: parsePricingFeatures(plan.features),
          ctaLabel: plan.ctaLabel,
          ctaHref: plan.ctaHref,
          purchasable: plan.purchasable,
          stripePriceIdMonthly: plan.stripePriceIdMonthly,
          stripePriceIdYearly: plan.stripePriceIdYearly,
          sortOrder: plan.sortOrder,
          isActive: plan.isActive,
        }}
      />
    </div>
  );
}
