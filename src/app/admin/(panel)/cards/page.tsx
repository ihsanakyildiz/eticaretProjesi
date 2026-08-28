import type { Metadata } from "next";
import Link from "next/link";
import { LayoutGrid, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { CardsTable } from "./cards-table";

export const metadata: Metadata = {
  title: "Kartlar",
  description: "Ön yüz kartlarını yönetin",
};

export default async function CardsPage() {
  const cards = await prisma.card.findMany({
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: {
      id: true,
      type: true,
      title: true,
      mediaType: true,
      image: true,
      icon: true,
      href: true,
      isActive: true,
      sortOrder: true,
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
              <LayoutGrid className="h-6 w-6 text-[#405189]" />
              Kartlar
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Klasik hizmet kartları veya gelişmiş “Neden Biz” tarzı split kartlar
              oluşturun. Yeni kart eklerken tipi seçersiniz.
            </p>
          </div>
          <Link
            href="/admin/cards/new"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0ab39c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#099885]"
          >
            <Plus className="h-4 w-4" />
            Yeni Kart
          </Link>
        </div>
      </div>

      <CardsTable cards={cards} />
    </div>
  );
}
