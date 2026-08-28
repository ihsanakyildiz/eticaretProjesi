import { collectDescendantIds } from "@/lib/category-tree";
import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";

export const WORK_CACHE_TAG = "works";
export const WORK_GRID_PAGE_SIZE = 9;
export const WORK_CATEGORY_PATH = "/yapilan-isler/kategori";
const CACHE_REVALIDATE = 60;

const workListSelect = {
  id: true,
  title: true,
  slug: true,
  summary: true,
  image: true,
  category: { select: { name: true, slug: true } },
} as const;

export function workCategoryHref(slug: string) {
  return `${WORK_CATEGORY_PATH}/${slug}`;
}

const workDetailInclude = {
  category: { select: { id: true, name: true, slug: true } },
  projects: {
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" as const }, { title: "asc" as const }],
    take: 6,
    select: {
      id: true,
      title: true,
      slug: true,
      summary: true,
      image: true,
      features: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" as const }, { name: "asc" as const }],
        take: 8,
        select: {
          id: true,
          name: true,
          description: true,
          icon: true,
        },
      },
    },
  },
};

export function bustWorkCache() {
  revalidateTag(WORK_CACHE_TAG);
}

export const getCachedWorkListing = unstable_cache(
  async () =>
    prisma.work.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
      select: workListSelect,
    }),
  ["work-listing"],
  { tags: [WORK_CACHE_TAG, "site"], revalidate: CACHE_REVALIDATE },
);

export const getCachedWorkSlugs = unstable_cache(
  async () =>
    prisma.work.findMany({
      where: { isActive: true },
      select: { slug: true },
    }),
  ["work-slugs"],
  { tags: [WORK_CACHE_TAG], revalidate: CACHE_REVALIDATE },
);

export function getCachedWorkBySlug(slug: string) {
  return unstable_cache(
    async () =>
      prisma.work.findFirst({
        where: { slug, isActive: true },
        include: workDetailInclude,
      }),
    ["work-detail", slug],
    { tags: [WORK_CACHE_TAG, "site"], revalidate: CACHE_REVALIDATE },
  )();
}

export const getCachedFallbackWorkSkills = unstable_cache(
  async () =>
    prisma.projectFeature.findMany({
      where: { isActive: true, showOnHome: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      take: 6,
      select: {
        id: true,
        name: true,
        description: true,
        icon: true,
      },
    }),
  ["work-fallback-skills"],
  { tags: [WORK_CACHE_TAG, "projects"], revalidate: CACHE_REVALIDATE },
);

export const getCachedWorkCategoryIndex = unstable_cache(
  async () => {
    const categories = await prisma.workCategory.findMany({
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
        _count: { select: { works: { where: { isActive: true } } } },
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
      const workCount = categories
        .filter((item) => descendantIds.has(item.id))
        .reduce((sum, item) => sum + item._count.works, 0);

      return {
        id: category.id,
        parentId: category.parentId,
        name: category.name,
        slug: category.slug,
        description: category.description,
        image: category.image,
        workCount,
      };
    });
  },
  ["work-category-index"],
  { tags: [WORK_CACHE_TAG, "site"], revalidate: CACHE_REVALIDATE },
);

export const getCachedWorkCategorySlugs = unstable_cache(
  async () =>
    prisma.workCategory.findMany({
      where: { isActive: true },
      select: { slug: true },
    }),
  ["work-category-slugs"],
  { tags: [WORK_CACHE_TAG], revalidate: CACHE_REVALIDATE },
);

export function getCachedWorkCategoryPage(slug: string) {
  return unstable_cache(
    async () => {
      const category = await prisma.workCategory.findFirst({
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
              _count: { select: { works: { where: { isActive: true } } } },
            },
          },
        },
      });
      if (!category) return null;

      const allCategories = await prisma.workCategory.findMany({
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

      const works = await prisma.work.findMany({
        where: {
          isActive: true,
          categoryId: { in: Array.from(descendantIds) },
        },
        orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
        select: workListSelect,
      });

      return { category, works };
    },
    ["work-category-page", slug],
    { tags: [WORK_CACHE_TAG, "site"], revalidate: CACHE_REVALIDATE },
  )();
}

