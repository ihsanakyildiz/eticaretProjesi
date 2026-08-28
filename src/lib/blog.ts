import { collectDescendantIds } from "@/lib/category-tree";
import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";

export const BLOG_CACHE_TAG = "blog";
export const BLOG_GRID_PAGE_SIZE = 9;
export const BLOG_CATEGORY_PATH = "/blog/kategori";
const CACHE_REVALIDATE = 60;

const blogPostListSelect = {
  id: true,
  title: true,
  slug: true,
  summary: true,
  image: true,
  category: { select: { name: true, slug: true } },
} as const;

export function blogCategoryHref(slug: string) {
  return `${BLOG_CATEGORY_PATH}/${slug}`;
}

export function bustBlogCache() {
  revalidateTag(BLOG_CACHE_TAG);
}

export const getCachedBlogListing = unstable_cache(
  async () =>
    prisma.blogPost.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
      select: blogPostListSelect,
    }),
  ["blog-listing"],
  { tags: [BLOG_CACHE_TAG, "site"], revalidate: CACHE_REVALIDATE },
);

export const getCachedBlogSlugs = unstable_cache(
  async () =>
    prisma.blogPost.findMany({
      where: { isActive: true },
      select: { slug: true },
    }),
  ["blog-slugs"],
  { tags: [BLOG_CACHE_TAG], revalidate: CACHE_REVALIDATE },
);

export function getCachedBlogDetailPayload(slug: string) {
  return unstable_cache(
    async () => {
      const post = await prisma.blogPost.findFirst({
        where: { slug, isActive: true },
        select: {
          id: true,
          title: true,
          slug: true,
          summary: true,
          content: true,
          image: true,
          seoTitle: true,
          seoDescription: true,
          updatedAt: true,
          categoryId: true,
          category: { select: { id: true, name: true, slug: true } },
        },
      });
      if (!post) return null;

      const [relatedPosts, categories] = await Promise.all([
        prisma.blogPost.findMany({
          where: {
            isActive: true,
            id: { not: post.id },
            ...(post.categoryId ? { categoryId: post.categoryId } : {}),
          },
          orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
          take: 4,
          select: {
            id: true,
            title: true,
            slug: true,
            summary: true,
            image: true,
          },
        }),
        prisma.blogCategory.findMany({
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            slug: true,
            _count: { select: { posts: { where: { isActive: true } } } },
          },
        }),
      ]);

      return { post, relatedPosts, categories };
    },
    ["blog-detail-payload", slug],
    { tags: [BLOG_CACHE_TAG, "site"], revalidate: CACHE_REVALIDATE },
  )();
}

export const getCachedBlogCategoryIndex = unstable_cache(
  async () => {
    const categories = await prisma.blogCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        parentId: true,
        name: true,
        slug: true,
        description: true,
        image: true,
        sortOrder: true,
        isActive: true,
        _count: { select: { posts: { where: { isActive: true } } } },
      },
    });

    const treeItems = categories.map((category) => ({
      id: category.id,
      parentId: category.parentId,
      name: category.name,
      slug: category.slug,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
    }));

    return categories.map((category) => {
      const descendantIds = collectDescendantIds(treeItems, category.id);
      const postCount = categories
        .filter((item) => descendantIds.has(item.id))
        .reduce((sum, item) => sum + item._count.posts, 0);

      return {
        id: category.id,
        parentId: category.parentId,
        name: category.name,
        slug: category.slug,
        description: category.description,
        image: category.image,
        postCount,
      };
    });
  },
  ["blog-category-index"],
  { tags: [BLOG_CACHE_TAG, "site"], revalidate: CACHE_REVALIDATE },
);

export const getCachedBlogCategorySlugs = unstable_cache(
  async () =>
    prisma.blogCategory.findMany({
      where: { isActive: true },
      select: { slug: true },
    }),
  ["blog-category-slugs"],
  { tags: [BLOG_CACHE_TAG], revalidate: CACHE_REVALIDATE },
);

export function getCachedBlogCategoryPage(slug: string) {
  return unstable_cache(
    async () => {
      const category = await prisma.blogCategory.findFirst({
        where: { slug, isActive: true },
        select: {
          id: true,
          parentId: true,
          name: true,
          slug: true,
          description: true,
          content: true,
          image: true,
          seoTitle: true,
          seoDescription: true,
          parent: { select: { name: true, slug: true, isActive: true } },
          children: {
            where: { isActive: true },
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
            select: {
              id: true,
              name: true,
              slug: true,
              image: true,
              _count: { select: { posts: { where: { isActive: true } } } },
            },
          },
        },
      });
      if (!category) return null;

      const allCategories = await prisma.blogCategory.findMany({
        where: { isActive: true },
        select: {
          id: true,
          parentId: true,
          name: true,
          slug: true,
          sortOrder: true,
          isActive: true,
        },
      });
      const descendantIds = collectDescendantIds(allCategories, category.id);

      const posts = await prisma.blogPost.findMany({
        where: {
          isActive: true,
          categoryId: { in: Array.from(descendantIds) },
        },
        orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
        select: blogPostListSelect,
      });

      return { category, posts };
    },
    ["blog-category-page", slug],
    { tags: [BLOG_CACHE_TAG, "site"], revalidate: CACHE_REVALIDATE },
  )();
}

