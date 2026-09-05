import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Megaphone } from "lucide-react";
import { loadAdminCampaignForm, loadCampaignFormLookups } from "@/lib/campaigns";
import { CampaignForm } from "../../campaign-form";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const metadata: Metadata = {
  title: "Kampanyayı düzenle",
  description: "Mevcut kampanya şartlarını güncelleyin",
};

export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [campaign, lookups] = await Promise.all([
    loadAdminCampaignForm(id),
    loadCampaignFormLookups(),
  ]);
  if (!campaign) notFound();

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <Link
          href={`/admin/campaigns/${campaign.id}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-[#405189] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Kampanya detayına dön
        </Link>
        <h1 className="mt-3 flex items-center gap-2 text-xl font-semibold text-slate-800 sm:text-2xl">
          <Megaphone className="h-6 w-6 text-[#405189]" />
          Kampanyayı düzenle
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Ad, model, tarih ve hedefleri güncelleyin. Kayıtta çıkan ürünlerin fiyatı geri alınır,
          yeni eşleşen vitrin ürünlerine kampanya uygulanır. Yeniden oluşturmanıza gerek yoktur.
        </p>
      </div>
      <CampaignForm
        categories={lookups.categories}
        brands={lookups.brands}
        initial={campaign}
      />
    </div>
  );
}
