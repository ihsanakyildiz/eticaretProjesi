import type { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  defaultLimitForType,
  parseSectionSettings,
  type PageSectionSettings,
  type PageSectionTypeValue,
} from "@/lib/page-sections";
import {
  getActivePricingPlans,
  type PricingPlanView,
} from "@/lib/pricing";

const sectionInclude = {
  cards: {
    orderBy: { sortOrder: "asc" as const },
    include: { card: true },
  },
  projects: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      project: {
        select: {
          id: true,
          title: true,
          summary: true,
          slug: true,
          image: true,
          isActive: true,
        },
      },
    },
  },
  posts: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      post: {
        select: {
          id: true,
          title: true,
          summary: true,
          slug: true,
          image: true,
          isActive: true,
          category: { select: { name: true } },
        },
      },
    },
  },
  works: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      work: {
        select: {
          id: true,
          title: true,
          slug: true,
          image: true,
          previewImage: true,
          categoryId: true,
          isActive: true,
          category: { select: { id: true, name: true } },
        },
      },
    },
  },
  hero: {
    include: {
      slides: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
        include: {
          media: {
            orderBy: [{ kind: "asc" as const }, { sortOrder: "asc" as const }],
          },
        },
      },
    },
  },
  faqGroup: {
    include: {
      items: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
      },
    },
  },
  projectCategory: { select: { id: true, name: true, slug: true } },
  workCategory: { select: { id: true, name: true, slug: true } },
  blogCategory: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.PageSectionInclude;

export type AdvancedPageWithSections = Prisma.PageGetPayload<{
  include: {
    sections: {
      include: typeof sectionInclude;
    };
  };
}>;

export type DbPageSection = AdvancedPageWithSections["sections"][number];

export async function getAdvancedPageBySlug(slug: string) {
  return prisma.page.findFirst({
    where: { slug, type: "ADVANCED", isActive: true },
    include: {
      sections: {
        where: {
          isActive: true,
          OR: [{ parentId: null }, { parent: { isActive: true } }],
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: sectionInclude,
      },
    },
  });
}

export async function getClassicPageBySlug(slug: string) {
  return prisma.page.findFirst({
    where: { slug, type: "CLASSIC", isActive: true },
    include: {
      works: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
        select: {
          id: true,
          title: true,
          slug: true,
          summary: true,
          image: true,
        },
      },
      projects: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
        select: {
          id: true,
          title: true,
          slug: true,
          summary: true,
          image: true,
        },
      },
      posts: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
        select: {
          id: true,
          title: true,
          slug: true,
          summary: true,
          image: true,
          category: { select: { name: true } },
        },
      },
    },
  });
}

export type ResolvedPageSection = {
  id: string;
  type: PageSectionTypeValue;
  parentId: string | null;
  title: string | null;
  subtitle: string | null;
  content: string | null;
  settings: PageSectionSettings;
  children: ResolvedPageSection[];
  hero: DbPageSection["hero"];
  faqGroup: {
    id: string;
    name: string;
    items: { id: string; question: string; answer: string }[];
  } | null;
  cards: {
    id: string;
    type: string;
    title: string;
    badgeText: string | null;
    subtitle: string | null;
    description: string | null;
    features: string | null;
    layout: string;
    mediaType: string;
    image: string | null;
    icon: string | null;
    showFrame: boolean;
    showSparkles: boolean;
    videoLabel: string | null;
    videoUrl: string | null;
    profileName: string | null;
    profileRole: string | null;
    profileImage: string | null;
    statValue: string | null;
    statLabel: string | null;
    href: string;
  }[];
  projects: {
    title: string;
    summary: string | null;
    slug: string;
    image: string | null;
  }[];
  projectFeatures: {
    id: string;
    name: string;
    description: string | null;
  }[];
  works: {
    id: string;
    title: string;
    slug: string;
    image: string | null;
    previewImage: string | null;
    categoryId: string | null;
    categoryName: string | null;
  }[];
  workCategories: { id: string; name: string }[];
  posts: {
    title: string;
    summary: string | null;
    slug: string;
    image: string | null;
    category: string | null;
  }[];
  clients: {
    id: string;
    name: string;
    logo: string | null;
    website: string | null;
    sector: string | null;
  }[];
  pricingPlans: PricingPlanView[];
};

async function resolveProjectsSection(section: DbPageSection, limit: number) {
  const picked = section.projects
    .map((row) => row.project)
    .filter((project) => project.isActive);

  if (picked.length > 0) {
    return picked.slice(0, limit).map((project) => ({
      title: project.title,
      summary: project.summary,
      slug: project.slug,
      image: project.image,
    }));
  }

  return prisma.project.findMany({
    where: {
      isActive: true,
      ...(section.projectCategoryId
        ? { categoryId: section.projectCategoryId }
        : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    take: limit,
    select: {
      title: true,
      summary: true,
      slug: true,
      image: true,
    },
  });
}

async function resolveWorksSection(section: DbPageSection, limit: number) {
  const picked = section.works
    .map((row) => row.work)
    .filter((work) => work.isActive);

  if (picked.length > 0) {
    const works = picked.slice(0, limit).map((work) => ({
      id: work.id,
      title: work.title,
      slug: work.slug,
      image: work.image,
      previewImage: work.previewImage,
      categoryId: work.categoryId,
      categoryName: work.category?.name ?? null,
    }));
    const categoryMap = new Map<string, string>();
    for (const work of works) {
      if (work.categoryId && work.categoryName) {
        categoryMap.set(work.categoryId, work.categoryName);
      }
    }
    return {
      works,
      workCategories: [...categoryMap.entries()].map(([id, name]) => ({
        id,
        name,
      })),
    };
  }

  const works = await prisma.work.findMany({
    where: {
      isActive: true,
      ...(section.workCategoryId ? { categoryId: section.workCategoryId } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    take: limit,
    select: {
      id: true,
      title: true,
      slug: true,
      image: true,
      previewImage: true,
      categoryId: true,
      category: { select: { id: true, name: true } },
    },
  });

  const mapped = works.map((work) => ({
    id: work.id,
    title: work.title,
    slug: work.slug,
    image: work.image,
    previewImage: work.previewImage,
    categoryId: work.categoryId,
    categoryName: work.category?.name ?? null,
  }));

  const categoryIds = [
    ...new Set(
      mapped
        .map((work) => work.categoryId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const categories =
    categoryIds.length === 0
      ? []
      : await prisma.workCategory.findMany({
          where: {
            isActive: true,
            id: { in: categoryIds },
          },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: { id: true, name: true },
        });

  return { works: mapped, workCategories: categories };
}

async function resolveBlogSection(section: DbPageSection, limit: number) {
  const picked = section.posts
    .map((row) => row.post)
    .filter((post) => post.isActive);

  if (picked.length > 0) {
    return picked.slice(0, limit).map((post) => ({
      title: post.title,
      summary: post.summary,
      slug: post.slug,
      image: post.image,
      category: post.category?.name ?? null,
    }));
  }

  const posts = await prisma.blogPost.findMany({
    where: {
      isActive: true,
      ...(section.blogCategoryId ? { categoryId: section.blogCategoryId } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    take: limit,
    select: {
      title: true,
      summary: true,
      slug: true,
      image: true,
      category: { select: { name: true } },
    },
  });

  return posts.map((post) => ({
    title: post.title,
    summary: post.summary,
    slug: post.slug,
    image: post.image,
    category: post.category?.name ?? null,
  }));
}

export async function resolvePageSections(
  sections: DbPageSection[],
): Promise<ResolvedPageSection[]> {
  const resolvedFlat: ResolvedPageSection[] = [];

  for (const section of sections) {
    const type = section.type as PageSectionTypeValue;
    const settings = parseSectionSettings(section.settings);
    const limit = settings.limit ?? defaultLimitForType(type);

    const base: ResolvedPageSection = {
      id: section.id,
      type,
      parentId: section.parentId ?? null,
      title: section.title,
      subtitle: section.subtitle,
      content: section.content,
      settings,
      children: [],
      hero: section.hero,
      faqGroup: section.faqGroup
        ? {
            id: section.faqGroup.id,
            name: section.faqGroup.name,
            items: section.faqGroup.items.map((item) => ({
              id: item.id,
              question: item.question,
              answer: item.answer,
            })),
          }
        : null,
      cards: [],
      projects: [],
      projectFeatures: [],
      works: [],
      workCategories: [],
      posts: [],
      clients: [],
      pricingPlans: [],
    };

    switch (type) {
      case "HERO":
      case "RICH_TEXT":
      case "CTA":
      case "FAQ":
      case "CONTACT_FORM":
      case "CONTACT_INFO":
      case "GRID_ROW":
        break;
      case "PRICING": {
        base.pricingPlans = await getActivePricingPlans();
        break;
      }
      case "TRUSTED_CLIENTS": {
        base.clients = await prisma.projectClient.findMany({
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            logo: true,
            website: true,
            sector: true,
          },
        });
        break;
      }
      case "CARDS": {
        const picked = section.cards
          .map((row) => row.card)
          .filter((card) => card.isActive && card.type === "CLASSIC");
        base.cards = (
          picked.length > 0
            ? picked
            : await prisma.card.findMany({
                where: { isActive: true, type: "CLASSIC" },
                orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
                take: limit,
              })
        ).slice(0, limit);
        break;
      }
      case "ADVANCED_CARD": {
        const picked = section.cards
          .map((row) => row.card)
          .filter((card) => card.isActive && card.type === "ADVANCED");
        if (picked.length > 0) {
          base.cards = [picked[0]!];
        } else {
          const fallback = await prisma.card.findFirst({
            where: { isActive: true, type: "ADVANCED" },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          });
          base.cards = fallback ? [fallback] : [];
        }
        break;
      }
      case "PROJECTS": {
        base.projects = await resolveProjectsSection(section, limit);
        if (settings.showFeatures !== false) {
          base.projectFeatures = await prisma.projectFeature.findMany({
            where: { isActive: true, showOnHome: true },
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
            take: 8,
            select: {
              id: true,
              name: true,
              description: true,
            },
          });
        }
        break;
      }
      case "WORKS": {
        const worksData = await resolveWorksSection(section, limit);
        base.works = worksData.works;
        base.workCategories = worksData.workCategories;
        break;
      }
      case "BLOG": {
        base.posts = await resolveBlogSection(section, limit);
        break;
      }
      default: {
        const _exhaustive: never = type;
        void _exhaustive;
      }
    }

    resolvedFlat.push(base);
  }

  const byId = new Map(resolvedFlat.map((item) => [item.id, item]));
  const roots: ResolvedPageSection[] = [];

  for (const section of sections) {
    const item = byId.get(section.id);
    if (!item) continue;
    if (section.parentId) {
      const parent = byId.get(section.parentId);
      if (parent) parent.children.push(item);
    } else {
      roots.push(item);
    }
  }

  return roots;
}

export const getCachedHomepageAdvanced = unstable_cache(
  async () => {
    const advanced = await getAdvancedPageBySlug("anasayfa");
    if (!advanced || advanced.sections.length === 0) {
      return null;
    }
    const sections = await resolvePageSections(advanced.sections);
    return {
      title: advanced.title,
      seoTitle: advanced.seoTitle,
      seoDescription: advanced.seoDescription,
      sections,
    };
  },
  ["homepage-advanced"],
  { tags: ["site", "pages"], revalidate: 60 },
);
