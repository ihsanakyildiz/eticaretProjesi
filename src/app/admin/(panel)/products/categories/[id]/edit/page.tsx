import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  buildCategoryTree,
  collectDescendantIds,
  pruneCategoryTree,
  toNamedTree,
} from "@/lib/category-tree";
import { prisma } from "@/lib/prisma";
import { ProductCategoryForm } from "../../category-form";
import { getSettingsMap } from "@/lib/settings";
import { parseUrlStructure, publicCategoryIndexPath } from "@/lib/url-structure";

type EditPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: EditPageProps): Promise<Metadata> {
  const { id } = await params;
  const category = await prisma.productCategory.findUnique({
    where: { id },
    select: { name: true },
  });
  return { title: category ? `Düzenle: ${category.name}` : "Kategori Düzenle" };
}

export default async function EditProductCategoryPage({ params }: EditPageProps) {
  const { id } = await params;
  const category = await prisma.productCategory.findUnique({ where: { id } });
  if (!category) notFound();

  const categories = await prisma.productCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      parentId: true,
      name: true,
      slug: true,
      sortOrder: true,
      isActive: true,
    },
  });

  const blocked = collectDescendantIds(categories, id);
  const tree = pruneCategoryTree(buildCategoryTree(categories), blocked);
  const settings = await getSettingsMap().catch(() => ({}) as Record<string, string>);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
          Mağaza
        </p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">
          Kategoriyi Düzenle
        </h1>
        <p className="mt-2 text-sm text-slate-500">{category.name}</p>
      </div>

      <ProductCategoryForm
        mode="edit"
        parentTree={toNamedTree(tree)}
        categoryPathPreview={publicCategoryIndexPath(parseUrlStructure(settings))}
        initial={{
          id: category.id,
          parentId: category.parentId,
          name: category.name,
          slug: category.slug,
          description: category.description ?? "",
          image: category.image ?? "",
          seoTitle: category.seoTitle ?? "",
          seoDescription: category.seoDescription ?? "",
          sortOrder: category.sortOrder,
          isActive: category.isActive,
        }}
      />
    </div>
  );
}
