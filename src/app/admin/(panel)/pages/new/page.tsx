import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileText, LayoutTemplate, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Yeni Sayfa",
  description: "Sayfa tipini seçin",
};

export default function NewPageTypePickerPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <Link
          href="/admin/pages"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Sayfalara dön
        </Link>
        <h1 className="mt-3 text-xl font-semibold text-slate-800 sm:text-2xl">
          Yeni Sayfa
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Klasik sayfalar metin + ilişkili içeriklerle çalışır. Gelişmiş sayfalar
          Elementor benzeri bölüm builder ile yapılandırılır.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/admin/pages/new/classic"
          className="group rounded-lg border border-[#e9ebec] bg-white p-6 shadow-sm transition hover:border-[#0ab39c]/40 hover:shadow-md"
        >
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-[#0ab39c]/10 text-[#0ab39c]">
            <FileText className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-lg font-semibold text-slate-800 group-hover:text-[#0ab39c]">
            Klasik Sayfa
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Başlık, içerik, SEO ve kapak görseli. İsterseniz yapılan işler, projeler
            ve blog yazılarından seçim yapıp sayfada gösterebilirsiniz.
          </p>
          <p className="mt-4 text-sm font-semibold text-[#0ab39c]">Devam et →</p>
        </Link>

        <Link
          href="/admin/pages/new/advanced"
          className="group rounded-lg border border-[#e9ebec] bg-white p-6 shadow-sm transition hover:border-[#405189]/40 hover:shadow-md"
        >
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-[#405189]/10 text-[#405189]">
            <LayoutTemplate className="h-6 w-6" />
          </span>
          <h2 className="mt-4 flex items-center gap-2 text-lg font-semibold text-slate-800 group-hover:text-[#405189]">
            Gelişmiş Sayfa
            <Sparkles className="h-4 w-4 text-[#405189]" />
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Hero, kart, proje, blog, SSS ve CTA bölümlerini ekleyin; sırayı
            değiştirin; her blokta hangi içeriğin görüneceğini seçin.
          </p>
          <p className="mt-4 text-sm font-semibold text-[#405189]">Devam et →</p>
        </Link>
      </div>
    </div>
  );
}
