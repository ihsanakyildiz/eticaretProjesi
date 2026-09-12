import type { Metadata } from "next";
import Link from "next/link";
import { Megaphone, Plus } from "lucide-react";
import { Can } from "@/components/admin/admin-permissions";
import { campaignPhaseLabel } from "@/lib/campaign-kinds";
import { loadCampaignStatsSummaries } from "@/lib/campaign-stats";
import { loadAdminCampaignPage } from "@/lib/campaigns";
import { CampaignStatsButton } from "./campaign-stats-modal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kampanyalar",
  description: "Toplu ürün kampanyalarını yönetin",
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

function phaseClass(phase: string) {
  switch (phase) {
    case "active":
      return "bg-emerald-50 text-emerald-700";
    case "scheduled":
      return "bg-sky-50 text-sky-700";
    case "ended":
      return "bg-slate-100 text-slate-600";
    case "disabled":
      return "bg-rose-50 text-rose-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawPage = Array.isArray(params.page) ? params.page[0] : params.page;
  const page = Math.max(1, Number(rawPage) || 1);
  const list = await loadAdminCampaignPage(page);
  const stats = await loadCampaignStatsSummaries(list.campaigns.map((campaign) => campaign.id));

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Mağaza</p>
            <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold text-slate-800 sm:text-2xl">
              <Megaphone className="h-6 w-6 text-[#405189]" />
              Kampanyalar
              <span className="text-base font-medium text-slate-400">
                ({list.total.toLocaleString("tr-TR")})
              </span>
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Kategori, marka, stoklu ürün veya seçili ürünlere yüzde, tutar, kargo ve sepet
              indirimi uygulayın. Yalnızca vitrinde görünen ürünler alınır. Açık kampanyadaki
              ürünler yeni kampanyaya alınmaz.
            </p>
          </div>
          <Can resource="campaigns" action="create">
            <Link
              href="/admin/campaigns/new"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0ab39c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#099885]"
            >
              <Plus className="h-4 w-4" />
              Yeni kampanya oluştur
            </Link>
          </Can>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Kampanya</th>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3">Ürün</th>
                <th className="px-4 py-3">Satış</th>
                <th className="px-4 py-3">Bitiş</th>
                <th className="px-4 py-3 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e9ebec]">
              {list.campaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    Henüz kampanya yok. Yeni kampanya oluşturun.
                  </td>
                </tr>
              ) : (
                list.campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/campaigns/${campaign.id}`}
                        className="font-semibold text-[#405189] hover:underline"
                      >
                        {campaign.name}
                      </Link>
                      <p className="text-xs text-slate-500">{campaign.offerLabel}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{campaign.kindLabel}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${phaseClass(campaign.phase)}`}
                      >
                        {campaignPhaseLabel(campaign.phase)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>{campaign.productCount.toLocaleString("tr-TR")}</div>
                      {campaign.listedProductCount === 0 && campaign.productCount > 0 ? (
                        <p className="text-xs text-amber-700">Vitrinde 0 ürün</p>
                      ) : campaign.listedProductCount !== campaign.productCount ? (
                        <p className="text-xs text-slate-400">
                          Vitrinde {campaign.listedProductCount.toLocaleString("tr-TR")}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <CampaignStatsButton
                        campaignId={campaign.id}
                        name={campaign.name}
                        summary={stats.get(campaign.id)}
                      />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatWhen(campaign.endsAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-3">
                        {campaign.status === "ACTIVE" ? (
                          <Link
                            href={`/admin/campaigns/${campaign.id}/edit`}
                            className="text-sm font-medium text-[#405189] hover:underline"
                          >
                            Düzenle
                          </Link>
                        ) : null}
                        <Link
                          href={`/admin/campaigns/${campaign.id}`}
                          className="text-sm font-medium text-[#405189] hover:underline"
                        >
                          Aç
                        </Link>
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
