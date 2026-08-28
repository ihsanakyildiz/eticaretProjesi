import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Tags } from "lucide-react";
import {
  buildCategoryTree,
  flattenCategoryTree,
} from "@/lib/category-tree";
import { prisma } from "@/lib/prisma";
import { ProjectCategoriesTable } from "./categories-table";

export const metadata: Metadata = {
  title: "Proje Kategorileri",
  description: "Proje kategorilerini yönetin",
};

export default async function ProjectCategoriesPage() {
  const categories = await prisma.projectCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      parentId: true,
      name: true,
      slug: true,
      description: true,
      image: true,
      isActive: true,
      sortOrder: true,
      _count: { select: { projects: true, children: true } },
    },
  });

  const tree = buildCategoryTree(
    categories.map((category) => ({
      id: category.id,
      parentId: category.parentId,
      name: category.name,
      slug: category.slug,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
    })),
  );
  const categoryOptions = flattenCategoryTree(tree).map((item) => ({
    id: item.id,
    label: item.name,
    depth: item.depth,
  }));

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
              Projeler
            </p>
            <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold text-slate-800 sm:text-2xl">
              <Tags className="h-6 w-6 text-[#405189]" />
              Proje Kategorileri
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Ana ve alt kategorilerle proje ağacınızı yönetin. Her satırdaki + ile sınırsız alt
              kategori ekleyebilirsiniz.
            </p>
          </div>
          <Link
            href="/admin/projects/categories/new"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0ab39c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#099885]"
          >
            <Plus className="h-4 w-4" />
            Yeni Kategori
          </Link>
        </div>
      </div>

      <ProjectCategoriesTable categories={categories} categoryOptions={categoryOptions} />
    </div>
  );
}
