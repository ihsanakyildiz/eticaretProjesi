import type { Metadata } from "next";
import Link from "next/link";
import { CircleDollarSign, Plus } from "lucide-react";
import { ensurePricingPlansTable } from "@/lib/ensure-pricing-schema";
import { prisma } from "@/lib/prisma";
import { getPricingBillingOptions } from "@/lib/pricing";
import { ensureDefaultSettings } from "@/lib/settings";
import { PricingBillingSettingsForm } from "./pricing-billing-settings-form";
import { PricingPlansTable } from "./pricing-plans-table";

export const metadata: Metadata = {
  title: "Fiyatlandırma",
  description: "Fiyatlandırma paketlerini yönetin",
};

export default async function PricingAdminPage() {
  await ensureDefaultSettings("pricing").catch(() => undefined);

  try {
    await ensurePricingPlansTable();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
        <p className="font-semibold">Fiyatlandırma tablosu güncellenemedi.</p>
        <p className="mt-2">
          Sunucuda şu komutları çalıştırın, ardından sayfayı yenileyin:
        </p>
        <pre className="mt-3 overflow-x-auto rounded-md bg-white/80 p-3 text-xs text-slate-800">
          {`npx prisma db push --skip-generate
npx prisma generate
pm2 restart ihsanakyildiz`}
        </pre>
        <p className="mt-3 text-xs text-rose-700/80">{detail}</p>
      </div>
    );
  }

  const [plans, billing] = await Promise.all([
    prisma.pricingPlan.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        blurb: true,
        priceMonthly: true,
        priceYearly: true,
        priceType: true,
        priceRangeMin: true,
        priceRangeMax: true,
        priceMonthlyDiscount: true,
        priceYearlyDiscount: true,
        featured: true,
        isActive: true,
        sortOrder: true,
      },
    }),
    getPricingBillingOptions(),
  ]);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
              İçerik
            </p>
            <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold text-slate-800 sm:text-2xl">
              <CircleDollarSign className="h-6 w-6 text-[#405189]" />
              Fiyatlandırma
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Tek seferlik proje paketlerini yönetin. Fiyatlar domain &amp;
              hostinge kurulum ve kaynak kod teslimini kapsar. Detay: /paket/[slug]
            </p>
          </div>
          <Link
            href="/admin/pricing/new"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0ab39c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#099885]"
          >
            <Plus className="h-4 w-4" />
            Yeni Paket
          </Link>
        </div>
      </div>

      <PricingBillingSettingsForm
        monthlyEnabled={billing.monthlyEnabled}
        yearlyEnabled={billing.yearlyEnabled}
      />

      <PricingPlansTable
        plans={plans.map((plan) => ({
          ...plan,
          slug: plan.slug ?? plan.id,
          priceType: plan.priceType ?? "FIXED",
          priceRangeMin: plan.priceRangeMin ?? null,
          priceRangeMax: plan.priceRangeMax ?? null,
          priceMonthlyDiscount: plan.priceMonthlyDiscount ?? null,
          priceYearlyDiscount: plan.priceYearlyDiscount ?? null,
        }))}
      />
    </div>
  );
}
