import type { Metadata } from "next";
import Link from "next/link";
import { Columns3, Plus } from "lucide-react";
import { getSidebarLocationLabel, getSidebarPlacementLabel } from "@/config/site-sidebars";
import { prisma } from "@/lib/prisma";
import { SidebarsTable } from "./sidebars-table";

export const metadata: Metadata = {
  title: "Sidebar Yönetimi",
  description: "Site kenar çubuklarını ve widget’larını yönetin",
};

export default async function SidebarsPage() {
  const sidebars = await prisma.siteSidebar.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      location: true,
      placement: true,
      isActive: true,
      sortOrder: true,
      _count: { select: { widgets: true } },
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
              <Columns3 className="h-6 w-6 text-[#405189]" />
              Sidebar Yönetimi
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              WordPress benzeri kenar çubukları oluşturun; kategoriler, iletişim
              bilgileri, metin ve görseller ekleyip blog, projeler veya yapılan
              işler sayfalarına atayın. Sol veya sağ yerleşimi seçebilirsiniz.
            </p>
          </div>
          <Link
            href="/admin/sidebars/new"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0ab39c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#099885]"
          >
            <Plus className="h-4 w-4" />
            Yeni Sidebar
          </Link>
        </div>
      </div>

      <SidebarsTable
        sidebars={sidebars.map((item) => ({
          ...item,
          locationLabel: getSidebarLocationLabel(item.location),
          placementLabel: getSidebarPlacementLabel(item.placement),
        }))}
      />
    </div>
  );
}
