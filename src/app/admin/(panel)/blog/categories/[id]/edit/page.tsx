import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPublicLink } from "@/components/admin/admin-public-link";
import {
  buildCategoryTree,
  collectDescendantIds,
  flattenCategoryTree,
} from "@/lib/category-tree";
import { prisma } from "@/lib/prisma";
import { publicBlogCategoryHref } from "@/lib/public-urls";
import { BlogCategoryForm } from "../../category-form";

type EditPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: EditPageProps): Promise<Metadata> {
  const { id } = await params;
  const category = await prisma.blogCategory.findUnique({
    where: { id },
    select: { name: true },
  });
  return { title: category ? `Düzenle: ${category.name}` : "Kategori Düzenle" };
}

export default async function EditBlogCategoryPage({ params }: EditPageProps) {
  const { id } = await params;
  const category = await prisma.blogCategory.findUnique({ where: { id } });
  if (!category) notFound();

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

  const blocked = collectDescendantIds(categories, id);
  const tree = buildCategoryTree(categories);
  const flat = flattenCategoryTree(tree);
  const parentOptions = flat
    .filter((item) => !blocked.has(item.id))
    .map((item) => ({
      id: item.id,
      label: item.name,
      depth: item.depth,
    }));

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
              Blog
            </p>
            <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">
              Kategoriyi Düzenle
            </h1>
            <p className="mt-2 text-sm text-slate-500">{category.name}</p>
          </div>
          <AdminPublicLink
            href={publicBlogCategoryHref(category.slug)}
            variant="button"
          />
        </div>
      </div>

      <BlogCategoryForm
        mode="edit"
        parentOptions={parentOptions}
        initial={{
          id: category.id,
          parentId: category.parentId,
          name: category.name,
          slug: category.slug,
          description: category.description ?? "",
          content: category.content ?? "",
          icon: category.icon ?? "",
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
