import type { Metadata } from "next";
import {
  buildCategoryTree,
  flattenCategoryTree,
} from "@/lib/category-tree";
import { prisma } from "@/lib/prisma";
import { WorkForm } from "../work-form";

export const metadata: Metadata = {
  title: "Yeni Çalışma",
};

type NewWorkPageProps = {
  searchParams: Promise<{ categoryId?: string }>;
};

export default async function NewWorkPage({ searchParams }: NewWorkPageProps) {
  const { categoryId } = await searchParams;

  const [categories, projects] = await Promise.all([
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
    prisma.project.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        isActive: true,
        client: { select: { name: true } },
      },
    }),
  ]);

  const tree = buildCategoryTree(categories);
  const flat = flattenCategoryTree(tree);
  const categoryOptions = flat.map((item) => ({
    id: item.id,
    label: item.name,
    depth: item.depth,
  }));

  const projectOptions = projects.map((project) => ({
    id: project.id,
    label: project.title,
    isActive: project.isActive,
    clientName: project.client?.name ?? null,
  }));

  const selectedCategory = categoryId
    ? categories.find((item) => item.id === categoryId)
    : undefined;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
          Yapılan İşler
        </p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">
          Yeni Çalışma
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {selectedCategory
            ? `Kategori: ${selectedCategory.name}`
            : "Yeni bir hizmet / çalışma içeriği oluşturun."}
        </p>
      </div>

      <WorkForm
        mode="create"
        initial={{ categoryId: selectedCategory?.id ?? null }}
        categoryOptions={categoryOptions}
        projectOptions={projectOptions}
      />
    </div>
  );
}
