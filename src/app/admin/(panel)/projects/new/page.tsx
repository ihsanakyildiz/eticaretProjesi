import type { Metadata } from "next";
import {
  buildCategoryTree,
  flattenCategoryTree,
} from "@/lib/category-tree";
import { prisma } from "@/lib/prisma";
import { ProjectForm } from "../project-form";

export const metadata: Metadata = {
  title: "Yeni Proje",
};

type NewProjectPageProps = {
  searchParams: Promise<{ categoryId?: string; clientId?: string }>;
};

export default async function NewProjectPage({ searchParams }: NewProjectPageProps) {
  const { categoryId, clientId } = await searchParams;

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
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, isActive: true },
    }),
    prisma.projectClient.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, sector: true },
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

  const featureOptions = features.map((feature) => ({
    id: feature.id,
    label: feature.name,
    isActive: feature.isActive,
  }));

  const clientOptions = clients.map((client) => ({
    id: client.id,
    label: client.sector ? `${client.name} (${client.sector})` : client.name,
    depth: 0,
  }));

  const faqGroupOptions = faqGroups.map((group) => ({
    id: group.id,
    label: group.name,
    depth: 0,
  }));

  const selectedCategory = categoryId
    ? categories.find((item) => item.id === categoryId)
    : undefined;
  const selectedClient = clientId
    ? clients.find((item) => item.id === clientId)
    : undefined;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
          Projeler
        </p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">
          Yeni Proje
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {selectedCategory
            ? `Kategori: ${selectedCategory.name}`
            : selectedClient
              ? `Müşteri: ${selectedClient.name}`
              : "Yeni bir portföy / proje içeriği oluşturun."}
        </p>
      </div>

      <ProjectForm
        mode="create"
        initial={{
          categoryId: selectedCategory?.id ?? null,
          clientId: selectedClient?.id ?? null,
        }}
        categoryOptions={categoryOptions}
        featureOptions={featureOptions}
        clientOptions={clientOptions}
        faqGroupOptions={faqGroupOptions}
      />
    </div>
  );
}
