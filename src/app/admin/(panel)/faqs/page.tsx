import type { Metadata } from "next";
import Link from "next/link";
import { CircleHelp, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { FaqGroupsTable } from "./faq-groups-table";

export const metadata: Metadata = {
  title: "Sıkça Sorulan Sorular",
  description: "SSS gruplarını yönetin",
};

export default async function FaqsPage() {
  const groups = await prisma.faqGroup.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      isActive: true,
      sortOrder: true,
      _count: { select: { items: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
              İçerik
            </p>
            <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold text-slate-800 sm:text-2xl">
              <CircleHelp className="h-6 w-6 text-[#405189]" />
              Sıkça Sorulan Sorular
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Birden fazla SSS grubu oluşturun; her grubun kendi soru-cevaplarını yönetin ve
              farklı sayfalarda kullanın.
            </p>
          </div>
          <Link
            href="/admin/faqs/new"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0ab39c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#099885]"
          >
            <Plus className="h-4 w-4" />
            Yeni SSS Grubu
          </Link>
        </div>
      </div>

      <FaqGroupsTable groups={groups} />
    </div>
  );
}
