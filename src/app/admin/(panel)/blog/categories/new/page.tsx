import type { Metadata } from "next";
import {
  buildCategoryTree,
  flattenCategoryTree,
  getCategoryBreadcrumb,
} from "@/lib/category-tree";
import { prisma } from "@/lib/prisma";
import { BlogCategoryForm } from "../category-form";

export const metadata: Metadata = {
  title: "Yeni Blog Kategorisi",
};

type NewPageProps = {
  searchParams: Promise<{ parentId?: string }>;
};

export default async function NewBlogCategoryPage({ searchParams }: NewPageProps) {
  const { parentId } = await searchParams;

  const categories = await prisma.blogCategory.findMany({
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
  const flat = flattenCategoryTree(tree);
  const parentOptions = flat.map((item) => ({
    id: item.id,
    label: item.name,
    depth: item.depth,
  }));

  const selectedParent = parentId
    ? categories.find((item) => item.id === parentId)
    : undefined;

  const breadcrumb = selectedParent
    ? getCategoryBreadcrumb(categories, selectedParent.id)
    : [];

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
          Blog
        </p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">
          {selectedParent ? "Yeni Alt Kategori" : "Yeni Blog Kategorisi"}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {selectedParent
            ? `Üst kategori: ${breadcrumb.map((item) => item.name).join(" › ")}`
            : "Örn. Web Tasarım, Web Programlama — veya mevcut bir kategorinin altına ekleyin."}
        </p>
      </div>

      <BlogCategoryForm
        mode="create"
        initial={{ parentId: selectedParent?.id ?? null }}
        parentOptions={parentOptions}
      />
    </div>
  );
}
