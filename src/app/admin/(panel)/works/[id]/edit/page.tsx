import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPublicLink } from "@/components/admin/admin-public-link";
import {
  buildCategoryTree,
  flattenCategoryTree,
} from "@/lib/category-tree";
import { prisma } from "@/lib/prisma";
import { resolveWorkSeo } from "@/lib/seo";
import { publicWorkHref } from "@/lib/public-urls";
import { WorkForm } from "../../work-form";

type EditWorkPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: EditWorkPageProps): Promise<Metadata> {
  const { id } = await params;
  const work = await prisma.work.findUnique({
    where: { id },
    select: { title: true },
  });
  return { title: work ? `Düzenle: ${work.title}` : "Çalışma Düzenle" };
}

export default async function EditWorkPage({ params }: EditWorkPageProps) {
  const { id } = await params;
  const work = await prisma.work.findUnique({
    where: { id },
    include: {
      projects: { select: { id: true } },
    },
  });
  if (!work) notFound();

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

  const selectedProjectIds = new Set(work.projects.map((project) => project.id));
  const projectOptions = projects
    .filter((project) => project.isActive || selectedProjectIds.has(project.id))
    .map((project) => ({
      id: project.id,
      label: project.title,
      isActive: project.isActive,
      clientName: project.client?.name ?? null,
    }));

  const autoSeo = resolveWorkSeo({
    title: work.title,
    summary: work.summary,
    content: work.content,
  });

  const seoTitle =
    work.seoTitle && work.seoTitle !== autoSeo.seoTitle ? work.seoTitle : "";
  const seoDescription =
    work.seoDescription && work.seoDescription !== autoSeo.seoDescription
      ? work.seoDescription
      : "";

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
              Yapılan İşler
            </p>
            <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">
              Çalışmayı Düzenle
            </h1>
            <p className="mt-2 text-sm text-slate-500">{work.title}</p>
          </div>
          <AdminPublicLink href={publicWorkHref(work.slug)} variant="button" />
        </div>
      </div>

      <WorkForm
        mode="edit"
        categoryOptions={categoryOptions}
        projectOptions={projectOptions}
        initial={{
          id: work.id,
          categoryId: work.categoryId,
          projectIds: work.projects.map((project) => project.id),
          title: work.title,
          slug: work.slug,
          summary: work.summary ?? "",
          content: work.content ?? "",
          image: work.image ?? "",
          previewImage: work.previewImage ?? "",
          sortOrder: work.sortOrder,
          isActive: work.isActive,
          seoTitle,
          seoDescription,
        }}
      />
    </div>
  );
}
