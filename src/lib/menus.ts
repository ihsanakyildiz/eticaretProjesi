import type { MenuLinkType, MenuPlacement, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { publicProductCategoryHref } from "@/lib/public-urls";
import { getSettingsMap } from "@/lib/settings";
import { DEFAULT_URL_STRUCTURE, parseUrlStructure, type UrlStructure } from "@/lib/url-structure";

export const MENU_LINK_TYPE_LABELS: Record<MenuLinkType, string> = {
  CUSTOM: "Özel link (Mega)",
  PAGE: "Sayfa",
  PRODUCT_CATEGORY: "Ürün kategorisi",
  WORK_CATEGORY: "İş kategorisi",
  WORK: "Çalışma",
  PROJECT_CATEGORY: "Proje kategorisi",
  PROJECT: "Proje",
  BLOG_CATEGORY: "Blog kategorisi",
  BLOG_POST: "Blog yazısı",
};

export const MENU_LINK_TYPES = Object.keys(MENU_LINK_TYPE_LABELS) as MenuLinkType[];

export const MENU_PLACEMENT_LABELS: Record<MenuPlacement, string> = {
  NONE: "Atanmamış (sitede otomatik gösterilmez)",
  TOP: "Top menü — arama çubuğunun üstü",
  HEADER: "Header — arama çubuğunun altı",
  FOOTER: "Footer — sayfa en altındaki bar",
};

export const MENU_PLACEMENT_SHORT: Record<MenuPlacement, string> = {
  NONE: "Atanmamış",
  TOP: "Top menü",
  HEADER: "Header",
  FOOTER: "Footer",
};

export const MENU_PLACEMENTS = Object.keys(MENU_PLACEMENT_LABELS) as MenuPlacement[];

const menuItemInclude = {
  page: { select: { id: true, title: true, slug: true } },
  productCategory: { select: { id: true, name: true, slug: true, urlId: true } },
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

export function resolveMenuItemHref(
  item: MenuItemWithLinks,
  structure: UrlStructure = DEFAULT_URL_STRUCTURE,
): string | null {
  if (item.href?.trim()) return item.href.trim();

  switch (item.linkType) {
    case "CUSTOM":
      return item.href?.trim() || null;
    case "PAGE":
      return item.page ? `/${item.page.slug}` : null;
    case "PRODUCT_CATEGORY":
      return item.productCategory
        ? publicProductCategoryHref(item.productCategory.slug, structure, item.productCategory.urlId)
        : null;
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
    case "PRODUCT_CATEGORY":
      return item.productCategory
        ? `Ürün kategorisi: ${item.productCategory.name}${
            item.includeProductSubcategories ? " (alt kategoriler dahil)" : ""
          }`
        : "Kategori seçilmedi";
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

type MenuTreeNode = MenuItemWithLinks & {
  hrefResolved: string | null;
  children: MenuTreeNode[];
};

function buildMenuTree(items: MenuItemWithLinks[], structure: UrlStructure): MenuTreeNode[] {
  const byParent = new Map<string | null, MenuItemWithLinks[]>();
  for (const item of items) {
    const key = item.parentId;
    const list = byParent.get(key) ?? [];
    list.push(item);
    byParent.set(key, list);
  }

  function build(parentId: string | null): MenuTreeNode[] {
    return (byParent.get(parentId) ?? []).map((item) => ({
      ...item,
      hrefResolved: resolveMenuItemHref(item, structure),
      children: build(item.id),
    }));
  }

  return build(null);
}

async function loadActiveMenu(where: Prisma.MenuGroupWhereInput) {
  const [group, settings] = await Promise.all([
    prisma.menuGroup.findFirst({
      where: { ...where, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        items: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          include: menuItemInclude,
        },
      },
    }),
    getSettingsMap().catch(() => ({}) as Record<string, string>),
  ]);

  if (!group) return null;

  const structure = parseUrlStructure(settings);

  return {
    id: group.id,
    name: group.name,
    slug: group.slug,
    description: group.description,
    placement: group.placement,
    items: buildMenuTree(group.items, structure),
  };
}

export async function getMenuBySlug(slug: string) {
  return loadActiveMenu({ slug });
}

export async function getMenuByPlacement(placement: MenuPlacement) {
  if (placement === "NONE") return null;
  return loadActiveMenu({ placement });
}
