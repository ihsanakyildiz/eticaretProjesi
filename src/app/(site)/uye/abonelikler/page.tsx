import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getMembershipFlags } from "@/lib/membership";
import { prisma } from "@/lib/prisma";
import { isStripeConfigured } from "@/lib/stripe";
import { ensureMemberPortalAccess } from "../actions";
import { StripePortalButton } from "./portal-button";

export const metadata: Metadata = {
  title: "Aboneliklerim",
};

type Props = {
  searchParams: Promise<{ success?: string; canceled?: string }>;
};

export default async function AboneliklerPage({ searchParams }: Props) {
  const access = await ensureMemberPortalAccess();
  if (!access.ok) {
    redirect(access.reason === "disabled" ? "/" : "/giris?callbackUrl=/uye/abonelikler");
  }

  const params = await searchParams;
  const flags = await getMembershipFlags();
  const subscriptions = await prisma.membershipSubscription.findMany({
    where: { userId: access.session.user.id },
    orderBy: { createdAt: "desc" },
    include: { pricingPlan: true },
  });

  const plans = await prisma.pricingPlan.findMany({
    where: { isActive: true, purchasable: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      {params.success === "1" ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Ödeme başarılı. Aboneliğiniz kısa süre içinde burada görünecektir.
        </div>
      ) : null}
      {params.canceled === "1" ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Ödeme iptal edildi.
        </div>
      ) : null}

      <section className="rounded-2xl border border-site-border bg-site-card p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-site-fg">Aboneliklerim</h2>
            <p className="mt-1 text-sm text-site-muted">
              Satın aldığınız paketler ve durumları.
            </p>
          </div>
          {flags.stripeEnabled && isStripeConfigured() ? <StripePortalButton /> : null}
        </div>

        {subscriptions.length === 0 ? (
          <p className="mt-6 text-sm text-site-muted">Henüz aboneliğiniz yok.</p>
        ) : (
          <ul className="mt-6 divide-y divide-site-border">
            {subscriptions.map((sub) => (
              <li key={sub.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="font-medium text-site-fg">{sub.pricingPlan.name}</p>
                  <p className="text-xs text-site-muted">
                    {sub.status} · {sub.billingInterval === "YEARLY" ? "Yıllık" : "Aylık"}
                  </p>
                </div>
                {sub.currentPeriodEnd ? (
                  <p className="text-xs text-site-muted">
                    Dönem sonu:{" "}
                    {new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(
                      sub.currentPeriodEnd,
                    )}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {flags.stripeEnabled && plans.length > 0 ? (
        <section className="rounded-2xl border border-site-border bg-site-card p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-site-fg">Paketler</h2>
          <p className="mt-1 text-sm text-site-muted">
            Satın almak için anasayfadaki fiyatlandırma bölümünü veya paket CTA’sını kullanın.
          </p>
          <ul className="mt-4 space-y-2">
            {plans.map((plan) => (
              <li
                key={plan.id}
                className="flex items-center justify-between rounded-lg border border-site-border px-4 py-3 text-sm"
              >
                <span className="font-medium text-site-fg">{plan.name}</span>
                <Link href="/#fiyatlandirma" className="text-site-primary hover:underline">
                  İncele
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
