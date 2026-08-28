import type { Metadata } from "next";
import Link from "next/link";
import { Menu, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { MenuGroupsTable } from "./menu-groups-table";

export const metadata: Metadata = {
  title: "Menüler",
  description: "Header, footer ve mega menüleri yönetin",
};

export default async function MenusPage() {
  const groups = await prisma.menuGroup.findMany({
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
              <Menu className="h-6 w-6 text-[#405189]" />
              Menüler
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Header, footer veya özel alanlar için menü grupları oluşturun; CMS
              içeriklerini veya özel mega linkleri sürükle-bırak ile düzenleyin.
            </p>
          </div>
          <Link
            href="/admin/menus/new"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0ab39c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#099885]"
          >
            <Plus className="h-4 w-4" />
            Yeni Menü
          </Link>
        </div>
      </div>

      <MenuGroupsTable groups={groups} />
    </div>
  );
}
