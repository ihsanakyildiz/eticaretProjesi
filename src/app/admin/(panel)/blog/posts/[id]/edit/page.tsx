import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPublicLink } from "@/components/admin/admin-public-link";
import {
  buildCategoryTree,
  flattenCategoryTree,
} from "@/lib/category-tree";
import { prisma } from "@/lib/prisma";
import { resolveBlogSeo } from "@/lib/seo";
import { publicBlogPostHref } from "@/lib/public-urls";
import { BlogPostForm } from "../../post-form";

type EditBlogPostPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: EditBlogPostPageProps): Promise<Metadata> {
  const { id } = await params;
  const post = await prisma.blogPost.findUnique({
    where: { id },
    select: { title: true },
  });
  return { title: post ? `Düzenle: ${post.title}` : "Yazı Düzenle" };
}

export default async function EditBlogPostPage({ params }: EditBlogPostPageProps) {
  const { id } = await params;
  const post = await prisma.blogPost.findUnique({
    where: { id },
  });
  if (!post) notFound();

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

  const autoSeo = resolveBlogSeo({
    title: post.title,
    summary: post.summary,
    content: post.content,
  });

  const seoTitle =
    post.seoTitle && post.seoTitle !== autoSeo.seoTitle ? post.seoTitle : "";
  const seoDescription =
    post.seoDescription && post.seoDescription !== autoSeo.seoDescription
      ? post.seoDescription
      : "";

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
              Blog
            </p>
            <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">
              Yazıyı Düzenle
            </h1>
            <p className="mt-2 text-sm text-slate-500">{post.title}</p>
          </div>
          <AdminPublicLink
            href={publicBlogPostHref(post.slug)}
            variant="button"
          />
        </div>
      </div>

      <BlogPostForm
        mode="edit"
        categoryOptions={categoryOptions}
        initial={{
          id: post.id,
          categoryId: post.categoryId,
          title: post.title,
          slug: post.slug,
          summary: post.summary ?? "",
          content: post.content ?? "",
          image: post.image ?? "",
          sortOrder: post.sortOrder,
          isActive: post.isActive,
          seoTitle,
          seoDescription,
        }}
      />
    </div>
  );
}
