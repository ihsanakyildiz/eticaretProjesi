import type { Metadata } from "next";
import Link from "next/link";
import { Gift, Plus } from "lucide-react";
import { Can } from "@/components/admin/admin-permissions";
import { discountCouponStatusLabel } from "@/lib/discount-coupon-kinds";
import { loadDiscountCouponStatsSummaries } from "@/lib/discount-coupon-stats";
import { loadAdminDiscountCouponPage } from "@/lib/discount-coupons";
import { formatMinorTl } from "@/lib/product-money";
import { CampaignsTabs } from "../campaigns-tabs";
import { CouponStatsButton } from "./coupon-stats-modal";
import { DisableCouponButton } from "./disable-coupon-button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hediye çeki",
  description: "İndirim kodlarını yönetin",
};

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusClass(status: "ACTIVE" | "DISABLED") {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-50 text-emerald-700";
    case "DISABLED":
      return "bg-rose-50 text-rose-700";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export default async function CouponsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawPage = Array.isArray(params.page) ? params.page[0] : params.page;
  const page = Math.max(1, Number(rawPage) || 1);
  const list = await loadAdminDiscountCouponPage(page);
  const stats = await loadDiscountCouponStatsSummaries(list.coupons.map((coupon) => coupon.id));

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Mağaza</p>
            <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold text-slate-800 sm:text-2xl">
              <Gift className="h-6 w-6 text-[#405189]" />
              Hediye çeki
              <span className="text-base font-medium text-slate-400">
                ({list.total.toLocaleString("tr-TR")})
              </span>
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              İndirim kodları oluşturun: yüzde veya sabit tutar, süre, minimum sepet ve
              kategori/marka/ürün kapsamı. Kullanım istatistiklerini listedeki butondan
              inceleyebilirsiniz.
            </p>
          </div>
          <Can resource="campaigns" action="create">
            <Link
              href="/admin/campaigns/coupons/new"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0ab39c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#099885]"
            >
              <Plus className="h-4 w-4" />
              Yeni hediye çeki
            </Link>
          </Can>
        </div>
        <div className="mt-5">
          <CampaignsTabs active="coupons" />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Kod</th>
                <th className="px-4 py-3">Tür</th>
                <th className="px-4 py-3">Kullanım</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3">Süre</th>
                <th className="px-4 py-3">Min. sepet</th>
                <th className="px-4 py-3">İstatistik</th>
                <th className="px-4 py-3 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e9ebec]">
              {list.coupons.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                    Henüz hediye çeki yok. Yeni kod oluşturun.
                  </td>
                </tr>
              ) : (
                list.coupons.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/campaigns/coupons/${coupon.id}/edit`}
                        className="font-mono font-semibold text-[#405189] hover:underline"
                      >
                        {coupon.code}
                      </Link>
                      {coupon.name ? (
                        <p className="text-xs text-slate-500">{coupon.name}</p>
                      ) : null}
                      <p className="text-xs text-slate-400">{coupon.scopeSummary}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>{coupon.kindLabel}</div>
                      <p className="text-xs text-slate-500">{coupon.offerLabel}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>{coupon.usageLabel}</div>
                      {coupon.customerLabel ? (
                        <p className="text-xs text-slate-500">{coupon.customerLabel}</p>
                      ) : null}
                      {coupon.usageMode === "ONCE" ? (
                        <p className="text-xs text-slate-400">
                          Kullanım: {coupon.redemptionCount}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(coupon.status)}`}
                      >
                        {discountCouponStatusLabel(coupon.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>{formatWhen(coupon.startsAt)}</div>
                      <p className="text-xs text-slate-400">{formatWhen(coupon.endsAt)}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {coupon.minSubtotalMinor > 0
                        ? formatMinorTl(coupon.minSubtotalMinor)
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <CouponStatsButton
                        couponId={coupon.id}
                        code={coupon.code}
                        usageCount={stats.get(coupon.id)?.usageCount ?? coupon.redemptionCount}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-3">
                        <Link
                          href={`/admin/campaigns/coupons/${coupon.id}/edit`}
                          className="text-sm font-medium text-[#405189] hover:underline"
                        >
                          Düzenle
                        </Link>
                        {coupon.status === "ACTIVE" ? (
                          <Can resource="campaigns" action="update">
                            <DisableCouponButton couponId={coupon.id} />
                          </Can>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
