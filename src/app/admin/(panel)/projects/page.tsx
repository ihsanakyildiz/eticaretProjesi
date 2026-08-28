import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase, Plus } from "lucide-react";
import {
  buildCategoryTree,
  flattenCategoryTree,
} from "@/lib/category-tree";
import { prisma } from "@/lib/prisma";
import { ProjectsTable } from "./projects-table";

export const metadata: Metadata = {
  title: "Projeler",
  description: "Portföy / proje içeriklerini yönetin",
};

type ProjectsPageProps = {
  searchParams: Promise<{ categoryId?: string }>;
};

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const { categoryId } = await searchParams;

  const [projects, categories, features] = await Promise.all([
    prisma.project.findMany({
      orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        image: true,
        isActive: true,
        isFeatured: true,
        projectYear: true,
        projectUrl: true,
        sortOrder: true,
        categoryId: true,
        clientId: true,
        statusNote: true,
        category: { select: { id: true, name: true, slug: true } },
        client: { select: { id: true, name: true, slug: true, sector: true } },
        features: {
          select: { id: true, name: true, slug: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    }),
    prisma.projectCategory.findMany({
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
    prisma.projectFeature.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  const tree = buildCategoryTree(categories);
  const categoryOptions = flattenCategoryTree(tree).map((item) => ({
    id: item.id,
    label: item.name,
    depth: item.depth,
  }));

  const featureOptions = features.map((feature) => ({
    id: feature.id,
    label: feature.name,
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
              Projeler
            </p>
            <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold text-slate-800 sm:text-2xl">
              <Briefcase className="h-6 w-6 text-[#405189]" />
              Projeler
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Portföy projelerinizi kategori, özellik, müşteri ve galeri ile yönetin. Vitrin
              yıldızı ile ana sayfada öne çıkarabilirsiniz.
            </p>
          </div>
          <Link
            href={
              initialCategoryId
                ? `/admin/projects/new?categoryId=${initialCategoryId}`
                : "/admin/projects/new"
            }
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0ab39c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#099885]"
          >
            <Plus className="h-4 w-4" />
            Yeni Proje
          </Link>
        </div>
      </div>

      <ProjectsTable
        projects={projects}
        categoryOptions={categoryOptions}
        featureOptions={featureOptions}
        initialCategoryId={initialCategoryId}
      />
    </div>
  );
}
