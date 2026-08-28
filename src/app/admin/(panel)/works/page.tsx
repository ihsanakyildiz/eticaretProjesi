import type { Metadata } from "next";
import Link from "next/link";
import { Layers, Plus } from "lucide-react";
import {
  buildCategoryTree,
  flattenCategoryTree,
} from "@/lib/category-tree";
import { prisma } from "@/lib/prisma";
import { WorksTable } from "./works-table";

export const metadata: Metadata = {
  title: "Çalışmalar",
  description: "Yapılan işler / hizmet içeriklerini yönetin",
};

type WorksPageProps = {
  searchParams: Promise<{ categoryId?: string }>;
};

export default async function WorksPage({ searchParams }: WorksPageProps) {
  const { categoryId } = await searchParams;

  const [works, categories] = await Promise.all([
    prisma.work.findMany({
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        image: true,
        isActive: true,
        sortOrder: true,
        categoryId: true,
        statusNote: true,
        category: { select: { id: true, name: true, slug: true } },
        projects: {
          select: { id: true, title: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    }),
    prisma.workCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        parentId: true,
        name: true,
        slug: true,
        sortOrder: true,
        isActive: true,
      },
    }),
  ]);

  const tree = buildCategoryTree(categories);
  const categoryOptions = flattenCategoryTree(tree).map((item) => ({
    id: item.id,
    label: item.name,
    depth: item.depth,
  }));

  const initialCategoryId =
    categoryId && categories.some((category) => category.id === categoryId)
      ? categoryId
      : undefined;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
              Yapılan İşler
            </p>
            <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold text-slate-800 sm:text-2xl">
              <Layers className="h-6 w-6 text-[#405189]" />
              Çalışmalar
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Sunduğunuz hizmetleri kategorilere ve örnek portföy projelerine bağlayarak
              yayınlayın. Aktif olanlar sitede listelenmeye hazırdır.
            </p>
          </div>
          <Link
            href={
              initialCategoryId
                ? `/admin/works/new?categoryId=${initialCategoryId}`
                : "/admin/works/new"
            }
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0ab39c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#099885]"
          >
            <Plus className="h-4 w-4" />
            Yeni Çalışma
          </Link>
        </div>
      </div>

      <WorksTable
        works={works}
        categoryOptions={categoryOptions}
        initialCategoryId={initialCategoryId}
      />
    </div>
  );
}
