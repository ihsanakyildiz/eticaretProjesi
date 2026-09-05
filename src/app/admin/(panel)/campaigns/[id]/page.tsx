import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Megaphone } from "lucide-react";
import { Can } from "@/components/admin/admin-permissions";
import { campaignPhaseLabel } from "@/lib/campaign-kinds";
import { loadAdminCampaignDetail } from "@/lib/campaigns";
import { CampaignEndButton } from "../campaign-end-button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kampanya detayı",
  description: "Kampanya ürünlerini görüntüleyin",
};

function formatWhen(iso: string | null) {
  if (!iso) return "Süresiz";
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const campaign = await loadAdminCampaignDetail(id);
  if (!campaign) notFound();
  const canEnd = campaign.phase === "active" || campaign.phase === "scheduled";

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <Link
          href="/admin/campaigns"
          className="inline-flex items-center gap-1 text-sm font-medium text-[#405189] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Kampanyalara dön
        </Link>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-800 sm:text-2xl">
              <Megaphone className="h-6 w-6 text-[#405189]" />
              {campaign.name}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {campaign.offerLabel} · {campaignPhaseLabel(campaign.phase)}
            </p>
          </div>
          <div className="flex flex-wrap items-start gap-2">
            {campaign.status === "ACTIVE" ? (
              <Can resource="campaigns" action="update">
                <Link
                  href={`/admin/campaigns/${campaign.id}/edit`}
                  className="rounded-md bg-[#405189] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#364574]"
                >
                  Düzenle
                </Link>
              </Can>
            ) : null}
            {canEnd ? (
              <Can resource="campaigns" action="update">
                <CampaignEndButton campaignId={campaign.id} />
              </Can>
            ) : null}
          </div>
        </div>
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-xs text-slate-400">Model</dt>
            <dd className="font-medium text-slate-800">{campaign.kindLabel}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Başlangıç</dt>
            <dd className="font-medium text-slate-800">{formatWhen(campaign.startsAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Bitiş</dt>
            <dd className="font-medium text-slate-800">{formatWhen(campaign.endsAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Geri sayım</dt>
            <dd className="font-medium text-slate-800">{campaign.countdown ? "Açık" : "Kapalı"}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Stok filtresi</dt>
            <dd className="font-medium text-slate-800">
              {campaign.inStockOnly ? "Yalnızca stoklu" : "Tüm eşleşenler"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Ürün sayısı</dt>
            <dd className="font-medium text-slate-800">
              {campaign.productCount.toLocaleString("tr-TR")}
              <span className="ml-1 font-normal text-slate-500">
                (vitrinde {campaign.listedProductCount.toLocaleString("tr-TR")})
              </span>
            </dd>
          </div>
          {campaign.categories.length > 0 ? (
            <div className="sm:col-span-2">
              <dt className="text-xs text-slate-400">Kategoriler</dt>
              <dd className="font-medium text-slate-800">{campaign.categories.join(", ")}</dd>
            </div>
          ) : null}
          {campaign.brands.length > 0 ? (
            <div className="sm:col-span-2">
              <dt className="text-xs text-slate-400">Markalar</dt>
              <dd className="font-medium text-slate-800">{campaign.brands.join(", ")}</dd>
            </div>
          ) : null}
        </dl>
        {campaign.listedProductCount === 0 && campaign.productCount > 0 ? (
          <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Bu kampanyadaki ürünlerin hiçbiri vitrinde görünmüyor. Kategori ve marka kesişiminde
            satıştaki ürün yoksa mağazada kampanya çıkmaz. Satıştaki ürünlerin olduğu hedefle
            kampanyayı düzenleyin.
          </p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="border-b border-[#e9ebec] px-4 py-3 text-sm font-semibold text-slate-700">
          Kampanyadaki ürünler
        </div>
        <ul className="divide-y divide-[#e9ebec]">
          {campaign.products.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-slate-500">Ürün yok.</li>
          ) : (
            campaign.products.map((product) => (
              <li key={product.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#f3f6f9]">
                  {product.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-semibold text-[#405189]">
                      {product.title.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/products/${product.id}/edit`}
                    className="truncate font-medium text-[#405189] hover:underline"
                  >
                    {product.title}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {product.sku || "SKU yok"}
                    {product.brandName ? ` · ${product.brandName}` : ""}
                    {product.restored ? " · fiyatlar geri alındı" : ""}
                  </p>
                </div>
              </li>
            ))
          )}
        </ul>
        {campaign.productCount > campaign.products.length ? (
          <p className="border-t border-[#e9ebec] px-4 py-3 text-xs text-slate-500">
            İlk {campaign.products.length} ürün gösteriliyor. Tümü ürünler sayfasında kampanya
            rozetiyle görünür.
          </p>
        ) : null}
      </div>
    </div>
  );
}
