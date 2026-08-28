import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PagesTable } from "./pages-table";

export const metadata: Metadata = {
  title: "Sayfalar",
  description: "Klasik ve gelişmiş sayfaları yönetin",
};

export default async function PagesPage() {
  const pages = await prisma.page.findMany({
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: {
      id: true,
      type: true,
      title: true,
      slug: true,
      summary: true,
      image: true,
      isActive: true,
      sortOrder: true,
      _count: { select: { works: true, projects: true, posts: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
              CMS
            </p>
            <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold text-slate-800 sm:text-2xl">
              <FileText className="h-6 w-6 text-[#405189]" />
              Sayfalar
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Hakkımızda, iletişim gibi klasik sayfalar oluşturun; ileride gelişmiş
              sayfa builder ile devam edeceğiz.
            </p>
          </div>
          <Link
            href="/admin/pages/new"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0ab39c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#099885]"
          >
            <Plus className="h-4 w-4" />
            Yeni Sayfa
          </Link>
        </div>
      </div>

      <PagesTable pages={pages} />
    </div>
  );
}
