import type { Metadata } from "next";
import {
  buildCategoryTree,
  getCategoryBreadcrumb,
  toNamedTree,
} from "@/lib/category-tree";
import { prisma } from "@/lib/prisma";
import { ProductCategoryForm } from "../category-form";
import { getSettingsMap } from "@/lib/settings";
import { parseUrlStructure, publicCategoryIndexPath } from "@/lib/url-structure";

export const metadata: Metadata = {
  title: "Yeni Ürün Kategorisi",
};

type NewPageProps = {
  searchParams: Promise<{ parentId?: string }>;
};

export default async function NewProductCategoryPage({ searchParams }: NewPageProps) {
  const { parentId } = await searchParams;

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

  const tree = buildCategoryTree(categories);
  const selectedParent = parentId
    ? categories.find((item) => item.id === parentId)
    : undefined;
  const breadcrumb = selectedParent
    ? getCategoryBreadcrumb(categories, selectedParent.id)
    : [];
  const settings = await getSettingsMap().catch(() => ({}) as Record<string, string>);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
          Mağaza
        </p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">
          {selectedParent ? "Yeni Alt Kategori" : "Yeni Ürün Kategorisi"}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {selectedParent
            ? `Üst kategori: ${breadcrumb.map((item) => item.name).join(" › ")}`
            : "Örn. Giyim, Aksesuar — veya mevcut bir kategorinin altına ekleyin."}
        </p>
      </div>

      <ProductCategoryForm
        mode="create"
        initial={{ parentId: selectedParent?.id ?? null }}
        parentTree={toNamedTree(tree)}
        categoryPathPreview={publicCategoryIndexPath(parseUrlStructure(settings))}
      />
    </div>
  );
}
