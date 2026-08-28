import type { MenuLinkType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const MENU_LINK_TYPE_LABELS: Record<MenuLinkType, string> = {
  CUSTOM: "Özel link (Mega)",
  PAGE: "Sayfa",
  WORK_CATEGORY: "İş kategorisi",
  WORK: "Çalışma",
  PROJECT_CATEGORY: "Proje kategorisi",
  PROJECT: "Proje",
  BLOG_CATEGORY: "Blog kategorisi",
  BLOG_POST: "Blog yazısı",
};

export const MENU_LINK_TYPES = Object.keys(MENU_LINK_TYPE_LABELS) as MenuLinkType[];

const menuItemInclude = {
  page: { select: { id: true, title: true, slug: true } },
  workCategory: { select: { id: true, name: true, slug: true } },
  work: { select: { id: true, title: true, slug: true } },
  projectCategory: { select: { id: true, name: true, slug: true } },
  project: { select: { id: true, title: true, slug: true } },
  blogCategory: { select: { id: true, name: true, slug: true } },
  blogPost: { select: { id: true, title: true, slug: true } },
} satisfies Prisma.MenuItemInclude;

export type MenuItemWithLinks = Prisma.MenuItemGetPayload<{
  include: typeof menuItemInclude;
}>;

export function resolveMenuItemHref(item: MenuItemWithLinks): string | null {
  if (item.href?.trim()) return item.href.trim();

  switch (item.linkType) {
    case "CUSTOM":
      return item.href?.trim() || null;
    case "PAGE":
      return item.page ? `/${item.page.slug}` : null;
    case "WORK_CATEGORY":
      return item.workCategory
        ? `/yapilan-isler/kategori/${item.workCategory.slug}`
        : null;
    case "WORK":
      return item.work ? `/yapilan-isler/${item.work.slug}` : null;
    case "PROJECT_CATEGORY":
      return item.projectCategory
        ? `/projeler/kategori/${item.projectCategory.slug}`
        : null;
    case "PROJECT":
      return item.project ? `/projeler/${item.project.slug}` : null;
    case "BLOG_CATEGORY":
      return item.blogCategory ? `/blog/kategori/${item.blogCategory.slug}` : null;
    case "BLOG_POST":
      return item.blogPost ? `/blog/${item.blogPost.slug}` : null;
    default: {
      const _exhaustive: never = item.linkType;
      return _exhaustive;
    }
  }
}

export function menuItemLinkSummary(item: MenuItemWithLinks): string {
  switch (item.linkType) {
    case "CUSTOM":
      return item.href?.trim() || "—";
    case "PAGE":
      return item.page ? `Sayfa: ${item.page.title}` : "Sayfa seçilmedi";
    case "WORK_CATEGORY":
      return item.workCategory
        ? `İş kategorisi: ${item.workCategory.name}`
        : "Kategori seçilmedi";
    case "WORK":
      return item.work ? `Çalışma: ${item.work.title}` : "Çalışma seçilmedi";
    case "PROJECT_CATEGORY":
      return item.projectCategory
        ? `Proje kategorisi: ${item.projectCategory.name}`
        : "Kategori seçilmedi";
    case "PROJECT":
      return item.project ? `Proje: ${item.project.title}` : "Proje seçilmedi";
    case "BLOG_CATEGORY":
      return item.blogCategory
        ? `Blog kategorisi: ${item.blogCategory.name}`
        : "Kategori seçilmedi";
    case "BLOG_POST":
      return item.blogPost ? `Yazı: ${item.blogPost.title}` : "Yazı seçilmedi";
    default: {
      const _exhaustive: never = item.linkType;
      return _exhaustive;
    }
  }
}

export async function getMenuBySlug(slug: string) {
  const group = await prisma.menuGroup.findFirst({
    where: { slug, isActive: true },
    include: {
      items: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: menuItemInclude,
      },
    },
  });

  if (!group) return null;

  type TreeNode = MenuItemWithLinks & {
    hrefResolved: string | null;
    children: TreeNode[];
  };

  const byParent = new Map<string | null, MenuItemWithLinks[]>();
  for (const item of group.items) {
    const key = item.parentId;
    const list = byParent.get(key) ?? [];
    list.push(item);
    byParent.set(key, list);
  }

  function build(parentId: string | null): TreeNode[] {
    return (byParent.get(parentId) ?? []).map((item) => ({
      ...item,
      hrefResolved: resolveMenuItemHref(item),
      children: build(item.id),
    }));
  }

  return {
    id: group.id,
    name: group.name,
    slug: group.slug,
    description: group.description,
    items: build(null),
  };
}
