import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Megaphone } from "lucide-react";
import { loadCampaignFormLookups } from "@/lib/campaigns";
import { CampaignForm } from "../campaign-form";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export const metadata: Metadata = {
  title: "Yeni kampanya",
  description: "Toplu ürün kampanyası oluşturun",
};

export default async function NewCampaignPage() {
  const lookups = await loadCampaignFormLookups();

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
        <h1 className="mt-3 flex items-center gap-2 text-xl font-semibold text-slate-800 sm:text-2xl">
          <Megaphone className="h-6 w-6 text-[#405189]" />
          Yeni kampanya oluştur
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Kategori ve marka filtrelerini, depo stoğunu ve seçilen ürünleri birlikte kullanabilirsiniz.
          Yalnızca vitrinde görünen ürünler alınır; kapalı ürünler dahil edilmez. Varyantlı
          ürünlerde tüm kombinasyonlar kampanyaya girer. Zaten açık bir kampanyadaki ürünler
          dışarıda bırakılır.
        </p>
      </div>
      <CampaignForm categories={lookups.categories} brands={lookups.brands} />
    </div>
  );
}
