import type { Metadata } from "next";
import Link from "next/link";
import { Images, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { HeroesTable } from "./heroes-table";

export const metadata: Metadata = {
  title: "Hero Alanları",
  description: "Gelişmiş hero slayt alanlarını yönetin",
};

export default async function HeroesPage() {
  const heroes = await prisma.hero.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      isActive: true,
      sortOrder: true,
      autoplay: true,
      intervalMs: true,
      _count: { select: { slides: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
              Görünüm
            </p>
            <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold text-slate-800 sm:text-2xl">
              <Images className="h-6 w-6 text-[#405189]" />
              Hero Alanları
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Birden fazla hero alanı oluşturun; her alanın kendi slaytları, metinleri,
              referans logoları ve gelişmiş görünüm ayarları olsun.
            </p>
          </div>
          <Link
            href="/admin/heroes/new"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0ab39c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#099885]"
          >
            <Plus className="h-4 w-4" />
            Yeni Hero Alanı
          </Link>
        </div>
      </div>

      <HeroesTable heroes={heroes} />
    </div>
  );
}
