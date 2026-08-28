import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, LayoutGrid, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Yeni Kart",
  description: "Kart tipini seçin",
};

export default function NewCardTypePickerPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <Link
          href="/admin/cards"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Kartlara dön
        </Link>
        <h1 className="mt-3 text-xl font-semibold text-slate-800 sm:text-2xl">
          Yeni Kart
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Oluşturmak istediğiniz kart tipini seçin. Klasik kartlar hizmet grid’i
          için; gelişmiş kartlar “Neden Biz” tarzı split yerleşimler içindir.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/admin/cards/new/classic"
          className="group rounded-lg border border-[#e9ebec] bg-white p-6 shadow-sm transition hover:border-[#0ab39c]/40 hover:shadow-md"
        >
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-[#0ab39c]/10 text-[#0ab39c]">
            <LayoutGrid className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-lg font-semibold text-slate-800 group-hover:text-[#0ab39c]">
            Klasik Kart
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Başlık, Lucide ikon veya görsel ve tıklanınca açılacak sayfa linki.
            Ana sayfa hizmet kartları için uygundur.
          </p>
          <p className="mt-4 text-sm font-semibold text-[#0ab39c]">Devam et →</p>
        </Link>

        <Link
          href="/admin/cards/new/advanced"
          className="group rounded-lg border border-[#e9ebec] bg-white p-6 shadow-sm transition hover:border-[#405189]/40 hover:shadow-md"
        >
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-[#405189]/10 text-[#405189]">
            <Sparkles className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-lg font-semibold text-slate-800 group-hover:text-[#405189]">
            Gelişmiş Kart
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Görsel solda / sağda / üstte / altta, zengin metin editörü, özellik
            listesi, video butonu ve profil + istatistik alanı.
          </p>
          <p className="mt-4 text-sm font-semibold text-[#405189]">Devam et →</p>
        </Link>
      </div>
    </div>
  );
}
