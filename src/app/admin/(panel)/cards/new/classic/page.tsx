import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { CardForm } from "../../card-form";

export const metadata: Metadata = {
  title: "Yeni Klasik Kart",
};

export default async function NewClassicCardPage() {
  const pages = await prisma.page.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: { id: true, title: true, slug: true },
  });

  const pageOptions = pages.map((page) => ({
    id: page.id,
    label: page.title,
    depth: 0,
    href: `/${page.slug}`,
  }));

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <Link
          href="/admin/cards/new"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Tip seçimine dön
        </Link>
        <p className="mt-3 text-xs font-medium tracking-wide text-slate-400 uppercase">
          Kartlar
        </p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">
          Yeni Klasik Kart
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Başlık, ikon/görsel ve açılacak sayfa linkini belirleyin.
        </p>
      </div>
      <CardForm mode="create" cardType="CLASSIC" pageOptions={pageOptions} />
    </div>
  );
}
