import type { Metadata } from "next";
import {
  buildCategoryTree,
  flattenCategoryTree,
} from "@/lib/category-tree";
import { prisma } from "@/lib/prisma";
import { BlogPostForm } from "../post-form";

export const metadata: Metadata = {
  title: "Yeni Blog Yazısı",
};

type NewBlogPostPageProps = {
  searchParams: Promise<{ categoryId?: string }>;
};

export default async function NewBlogPostPage({ searchParams }: NewBlogPostPageProps) {
  const { categoryId } = await searchParams;

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
  const categoryOptions = flat.map((item) => ({
    id: item.id,
    label: item.name,
    depth: item.depth,
  }));

  const selectedCategory = categoryId
    ? categories.find((item) => item.id === categoryId)
    : undefined;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
          Blog
        </p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">
          Yeni Yazı
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {selectedCategory
            ? `Kategori: ${selectedCategory.name}`
            : "Yeni bir blog yazısı oluşturun."}
        </p>
      </div>

      <BlogPostForm
        mode="create"
        initial={{ categoryId: selectedCategory?.id ?? null }}
        categoryOptions={categoryOptions}
      />
    </div>
  );
}
