import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPublicLink } from "@/components/admin/admin-public-link";
import {
  buildCategoryTree,
  flattenCategoryTree,
} from "@/lib/category-tree";
import { prisma } from "@/lib/prisma";
import { resolveProjectSeo } from "@/lib/seo";
import { publicProjectHref } from "@/lib/public-urls";
import { ProjectForm } from "../../project-form";

type EditProjectPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: EditProjectPageProps): Promise<Metadata> {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    select: { title: true },
  });
  return { title: project ? `Düzenle: ${project.title}` : "Proje Düzenle" };
}

export default async function EditProjectPage({ params }: EditProjectPageProps) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      features: { select: { id: true } },
      gallery: { orderBy: { sortOrder: "asc" }, select: { id: true, image: true, sortOrder: true } },
      metrics: { orderBy: { sortOrder: "asc" }, select: { label: true, value: true } },
    },
  });
  if (!project) notFound();

  const [categories, features, clients, faqGroups] = await Promise.all([
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
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, isActive: true },
    }),
    prisma.projectClient.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, sector: true, isActive: true },
    }),
    prisma.faqGroup.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  const tree = buildCategoryTree(categories);
  const flat = flattenCategoryTree(tree);
  const categoryOptions = flat.map((item) => ({
    id: item.id,
    label: item.name,
    depth: item.depth,
  }));

  const selectedIds = new Set(project.features.map((feature) => feature.id));
  const featureOptions = features
    .filter((feature) => feature.isActive || selectedIds.has(feature.id))
    .map((feature) => ({
      id: feature.id,
      label: feature.name,
      isActive: feature.isActive,
    }));

  const clientOptions = clients
    .filter((client) => client.isActive || client.id === project.clientId)
    .map((client) => ({
      id: client.id,
      label: client.sector ? `${client.name} (${client.sector})` : client.name,
      depth: 0,
    }));

  const faqGroupOptions = faqGroups.map((group) => ({
    id: group.id,
    label: group.name,
    depth: 0,
  }));

  const autoSeo = resolveProjectSeo({
    title: project.title,
    summary: project.summary,
    content: project.content,
  });

  const seoTitle =
    project.seoTitle && project.seoTitle !== autoSeo.seoTitle ? project.seoTitle : "";
  const seoDescription =
    project.seoDescription && project.seoDescription !== autoSeo.seoDescription
      ? project.seoDescription
      : "";

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
              Projeler
            </p>
            <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">
              Projeyi Düzenle
            </h1>
            <p className="mt-2 text-sm text-slate-500">{project.title}</p>
          </div>
          <AdminPublicLink href={publicProjectHref(project.slug)} variant="button" />
        </div>
      </div>

      <ProjectForm
        mode="edit"
        categoryOptions={categoryOptions}
        featureOptions={featureOptions}
        clientOptions={clientOptions}
        faqGroupOptions={faqGroupOptions}
        initial={{
          id: project.id,
          categoryId: project.categoryId,
          clientId: project.clientId,
          featureIds: project.features.map((feature) => feature.id),
          title: project.title,
          slug: project.slug,
          summary: project.summary ?? "",
          content: project.content ?? "",
          image: project.image ?? "",
          projectUrl: project.projectUrl ?? "",
          hideProjectUrl: project.hideProjectUrl,
          isFeatured: project.isFeatured,
          projectYear: project.projectYear,
          projectRole: project.projectRole ?? "",
          projectDuration: project.projectDuration ?? "",
          sortOrder: project.sortOrder,
          isActive: project.isActive,
          seoTitle,
          seoDescription,
          gallery: project.gallery,
          metrics: project.metrics,
          brochurePdf: project.brochurePdf,
          brochureZip: project.brochureZip,
          highlights: project.highlights,
          faqGroupId: project.faqGroupId,
        }}
      />
    </div>
  );
}
