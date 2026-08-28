import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdvancedPageMetaForm } from "../../advanced-page-meta-form";

export const metadata: Metadata = {
  title: "Yeni Gelişmiş Sayfa",
  description: "Elementor benzeri sayfa oluştur",
};

export default function NewAdvancedPagePage() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <Link
          href="/admin/pages/new"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Tip seçimine dön
        </Link>
        <p className="mt-3 text-xs font-medium tracking-wide text-[#405189] uppercase">
          Gelişmiş Sayfa
        </p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">
          Yeni gelişmiş sayfa
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Önce başlık ve slug’u kaydedin; ardından builder’da hero, kart, proje, blog
          ve SSS bölümlerini ekleyip sıralayın. Anasayfa için slug olarak{" "}
          <code className="rounded bg-slate-100 px-1">anasayfa</code> kullanın.
        </p>
      </div>

      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <AdvancedPageMetaForm mode="create" />
      </div>
    </div>
  );
}
