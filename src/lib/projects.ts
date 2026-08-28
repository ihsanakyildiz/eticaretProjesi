import { collectDescendantIds } from "@/lib/category-tree";
import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";

export const PROJECT_CACHE_TAG = "projects";
export const PROJECT_GRID_PAGE_SIZE = 9;
export const PROJECT_CATEGORY_PATH = "/projeler/kategori";
export const PROJECT_TAG_PATH = "/projeler/etiket";
const CACHE_REVALIDATE = 60;

const projectListSelect = {
  id: true,
  title: true,
  slug: true,
  summary: true,
  image: true,
  category: { select: { name: true, slug: true } },
} as const;

export function projectCategoryHref(slug: string) {
  return `${PROJECT_CATEGORY_PATH}/${slug}`;
}

export function projectTagHref(slug: string) {
  return `${PROJECT_TAG_PATH}/${slug}`;
}

const projectDetailInclude = {
  category: { select: { id: true, name: true, slug: true } },
  client: { select: { name: true, logo: true } },
  features: {
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" as const }, { name: "asc" as const }],
    select: {
      id: true,
      name: true,
      description: true,
      slug: true,
      icon: true,
      iconColor: true,
    },
  },
  gallery: {
    orderBy: { sortOrder: "asc" as const },
    select: { id: true, image: true, alt: true },
  },
  metrics: {
    orderBy: { sortOrder: "asc" as const },
    select: { id: true, label: true, value: true },
  },
  faqGroup: {
    include: {
      items: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
        select: { id: true, question: true, answer: true },
      },
    },
  },
};

export function bustProjectCache() {
  revalidateTag(PROJECT_CACHE_TAG);
}

export const getCachedProjectListing = unstable_cache(
  async () =>
    prisma.project.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
      select: projectListSelect,
    }),
  ["project-listing"],
  { tags: [PROJECT_CACHE_TAG, "site"], revalidate: CACHE_REVALIDATE },
);

export const getCachedProjectSlugs = unstable_cache(
  async () =>
    prisma.project.findMany({
      where: { isActive: true },
      select: { slug: true },
    }),
  ["project-slugs"],
  { tags: [PROJECT_CACHE_TAG], revalidate: CACHE_REVALIDATE },
);

export function getCachedProjectBySlug(slug: string) {
  return unstable_cache(
    async () =>
      prisma.project.findFirst({
        where: { slug, isActive: true },
        include: projectDetailInclude,
      }),
    ["project-detail", slug],
    { tags: [PROJECT_CACHE_TAG, "site"], revalidate: CACHE_REVALIDATE },
  )();
}

export function getCachedSiblingProjects(categoryId: string | null) {
  return unstable_cache(
    async () => {
      const limit = 12;
      const select = { id: true, title: true, slug: true } as const;
      const orderBy = [{ sortOrder: "asc" as const }, { title: "asc" as const }];

      const primary = await prisma.project.findMany({
        where: {
          isActive: true,
          ...(categoryId ? { categoryId } : {}),
        },
        orderBy,
        take: limit,
        select,
      });

      if (!categoryId || primary.length >= limit) {
        return primary;
      }

      const extra = await prisma.project.findMany({
        where: {
          isActive: true,
          id: { notIn: primary.map((item) => item.id) },
          ...(categoryId ? { NOT: { categoryId } } : {}),
        },
        orderBy,
        take: limit - primary.length,
        select,
      });

      return [...primary, ...extra];
    },
    ["project-siblings-v2", categoryId ?? "all"],
    { tags: [PROJECT_CACHE_TAG, "site"], revalidate: CACHE_REVALIDATE },
  )();
}

export const getCachedProjectCategoryIndex = unstable_cache(
  async () => {
    const categories = await prisma.projectCategory.findMany({
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
        _count: { select: { projects: { where: { isActive: true } } } },
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
      const projectCount = categories
        .filter((item) => descendantIds.has(item.id))
        .reduce((sum, item) => sum + item._count.projects, 0);

      return {
        id: category.id,
        parentId: category.parentId,
        name: category.name,
        slug: category.slug,
        description: category.description,
        image: category.image,
        projectCount,
      };
    });
  },
  ["project-category-index"],
  { tags: [PROJECT_CACHE_TAG, "site"], revalidate: CACHE_REVALIDATE },
);

export const getCachedProjectCategorySlugs = unstable_cache(
  async () =>
    prisma.projectCategory.findMany({
      where: { isActive: true },
      select: { slug: true },
    }),
  ["project-category-slugs"],
  { tags: [PROJECT_CACHE_TAG], revalidate: CACHE_REVALIDATE },
);

export function getCachedProjectCategoryPage(slug: string) {
  return unstable_cache(
    async () => {
      const category = await prisma.projectCategory.findFirst({
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
              _count: { select: { projects: { where: { isActive: true } } } },
            },
          },
        },
      });
      if (!category) return null;

      const allCategories = await prisma.projectCategory.findMany({
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

      const projects = await prisma.project.findMany({
        where: {
          isActive: true,
          categoryId: { in: Array.from(descendantIds) },
        },
        orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
        select: projectListSelect,
      });

      return { category, projects };
    },
    ["project-category-page", slug],
    { tags: [PROJECT_CACHE_TAG, "site"], revalidate: CACHE_REVALIDATE },
  )();
}

const tagListWhere = {
  isActive: true,
  projects: { some: { isActive: true } },
} as const;

export const getCachedProjectTagIndex = unstable_cache(
  async () =>
    prisma.projectFeature.findMany({
      where: tagListWhere,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        icon: true,
        iconColor: true,
        _count: { select: { projects: { where: { isActive: true } } } },
      },
    }),
  ["project-tag-index"],
  { tags: [PROJECT_CACHE_TAG, "site"], revalidate: CACHE_REVALIDATE },
);

export const getCachedProjectTagSlugs = unstable_cache(
  async () =>
    prisma.projectFeature.findMany({
      where: tagListWhere,
      select: { slug: true },
    }),
  ["project-tag-slugs"],
  { tags: [PROJECT_CACHE_TAG], revalidate: CACHE_REVALIDATE },
);

export function getCachedProjectTagPage(slug: string) {
  return unstable_cache(
    async () => {
      const feature = await prisma.projectFeature.findFirst({
        where: { slug, isActive: true },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          icon: true,
          iconColor: true,
        },
      });
      if (!feature) return null;

      const projects = await prisma.project.findMany({
        where: {
          isActive: true,
          features: { some: { id: feature.id } },
        },
        orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
        select: projectListSelect,
      });

      return { feature, projects };
    },
    ["project-tag-page", slug],
    { tags: [PROJECT_CACHE_TAG, "site"], revalidate: CACHE_REVALIDATE },
  )();
}
