import type { Metadata } from "next";
import Link from "next/link";
import { PenLine, Plus } from "lucide-react";
import {
  buildCategoryTree,
  flattenCategoryTree,
} from "@/lib/category-tree";
import { prisma } from "@/lib/prisma";
import { BlogPostsTable } from "./posts-table";

export const metadata: Metadata = {
  title: "Blog Yazıları",
  description: "Blog yazılarını yönetin",
};

type BlogPostsPageProps = {
  searchParams: Promise<{ categoryId?: string }>;
};

export default async function BlogPostsPage({ searchParams }: BlogPostsPageProps) {
  const { categoryId } = await searchParams;

  const [posts, categories] = await Promise.all([
    prisma.blogPost.findMany({
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        image: true,
        isActive: true,
        sortOrder: true,
        categoryId: true,
        statusNote: true,
        category: { select: { id: true, name: true, slug: true } },
      },
    }),
    prisma.blogCategory.findMany({
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
  ]);

  const tree = buildCategoryTree(categories);
  const categoryOptions = flattenCategoryTree(tree).map((item) => ({
    id: item.id,
    label: item.name,
    depth: item.depth,
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
              Blog
            </p>
            <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold text-slate-800 sm:text-2xl">
              <PenLine className="h-6 w-6 text-[#405189]" />
              Yazılar
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Blog yazılarını kategorilere bağlayarak yönetin. Aktif olanlar sitede
              listelenmeye hazırdır.
            </p>
          </div>
          <Link
            href={
              initialCategoryId
                ? `/admin/blog/posts/new?categoryId=${initialCategoryId}`
                : "/admin/blog/posts/new"
            }
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0ab39c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#099885]"
          >
            <Plus className="h-4 w-4" />
            Yeni Yazı
          </Link>
        </div>
      </div>

      <BlogPostsTable
        posts={posts}
        categoryOptions={categoryOptions}
        initialCategoryId={initialCategoryId}
      />
    </div>
  );
}
