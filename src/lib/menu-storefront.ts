import "server-only";

import type { SiteCategoryNavItem, SiteNavItem } from "@/components/site/site-types";
import { getCachedCatalogCategoryIndex } from "@/lib/catalog-products";
import { getMenuByPlacement, getMenuBySlug } from "@/lib/menus";
import { publicProductCategoryHref } from "@/lib/public-urls";
import { getSettingsMap } from "@/lib/settings";
import { parseUrlStructure, type UrlStructure } from "@/lib/url-structure";

type CategoryIndexRow = Awaited<ReturnType<typeof getCachedCatalogCategoryIndex>>[number];
type MenuTree = NonNullable<Awaited<ReturnType<typeof getMenuBySlug>>>;
type MenuTreeNode = MenuTree["items"][number];

export type PublicHeaderNav = {
  pageItems: SiteNavItem[];
  categoryItems: SiteCategoryNavItem[];
};

function categoryBranch(
  index: CategoryIndexRow[],
  parentId: string,
  urls: UrlStructure,
): SiteCategoryNavItem[] {
  return index
    .filter((row) => row.parentId === parentId && row.productCount > 0)
    .map((row) => {
      const children = categoryBranch(index, row.id, urls);
      return {
        label: row.name,
        href: publicProductCategoryHref(row.slug, urls, row.urlId),
        image: row.image,
        children: children.length > 0 ? children : undefined,
      };
    });
}

function categoryFromRow(
  row: CategoryIndexRow,
  index: CategoryIndexRow[],
  urls: UrlStructure,
): SiteCategoryNavItem {
  const children = categoryBranch(index, row.id, urls);
  return {
    label: row.name,
    href: publicProductCategoryHref(row.slug, urls, row.urlId),
    image: row.image,
    children: children.length > 0 ? children : undefined,
  };
}

function catalogRootCategories(
  index: CategoryIndexRow[],
  urls: UrlStructure,
): SiteCategoryNavItem[] {
  return index
    .filter((row) => !row.parentId && row.productCount > 0)
    .map((row) => categoryFromRow(row, index, urls));
}

function mapPageItems(nodes: MenuTreeNode[]): SiteNavItem[] {
  const result: SiteNavItem[] = [];
  for (const item of nodes) {
    if (item.linkType === "PRODUCT_CATEGORY") continue;
    const href = item.hrefResolved || item.href || "#";
    const children = mapPageItems(item.children);
    result.push({
      label: item.label,
      href,
      children: children.length > 0 ? children : undefined,
    });
  }
  return result;
}

function mapNavTree(nodes: MenuTreeNode[]): SiteNavItem[] {
  const result: SiteNavItem[] = [];
  for (const item of nodes) {
    const href = item.hrefResolved || item.href || "#";
    const children = mapNavTree(item.children);
    result.push({
      label: item.label,
      href,
      children: children.length > 0 ? children : undefined,
    });
  }
  return result;
}

function mapHeaderBarItems(
  nodes: MenuTreeNode[],
  index: CategoryIndexRow[],
  urls: UrlStructure,
): SiteCategoryNavItem[] {
  const result: SiteCategoryNavItem[] = [];
  for (const item of nodes) {
    if (item.linkType === "PRODUCT_CATEGORY" && item.productCategoryId) {
      const row = index.find((entry) => entry.id === item.productCategoryId);
      if (!row || row.productCount <= 0) continue;
      if (item.includeProductSubcategories) {
        result.push({
          ...categoryFromRow(row, index, urls),
          label: item.label,
        });
      } else {
        result.push({
          label: item.label,
          href: item.hrefResolved || publicProductCategoryHref(row.slug, urls, row.urlId),
          image: row.image,
        });
      }
      continue;
    }

    const href = item.hrefResolved || item.href || "#";
    const children = mapHeaderBarItems(item.children, index, urls);
    result.push({
      label: item.label,
      href,
      children: children.length > 0 ? children : undefined,
    });
  }
  return result;
}

export const FALLBACK_PAGE_NAV: SiteNavItem[] = [
  { label: "Ana Sayfa", href: "/" },
  { label: "Hizmetler", href: "/hizmetler" },
  { label: "Blog", href: "/blog" },
  { label: "İletişim", href: "/iletisim" },
];

export const FALLBACK_FOOTER_BAR: SiteNavItem[] = [
  { label: "Gizlilik", href: "/gizlilik" },
  { label: "İletişim", href: "/iletisim" },
];

export async function getPublicHeaderNav(): Promise<PublicHeaderNav> {
  const [index, topMenu, headerMenu, settings] = await Promise.all([
    getCachedCatalogCategoryIndex(),
    getMenuByPlacement("TOP").catch(() => null),
    getMenuByPlacement("HEADER").catch(() => null),
    getSettingsMap().catch(() => ({}) as Record<string, string>),
  ]);
  const urls = parseUrlStructure(settings);
  const catalogCategories = catalogRootCategories(index, urls);

  const pageItems = topMenu?.items.length ? mapPageItems(topMenu.items) : [];
  const headerItems = headerMenu?.items.length
    ? mapHeaderBarItems(headerMenu.items, index, urls)
    : [];

  return {
    pageItems: pageItems.length > 0 ? pageItems : FALLBACK_PAGE_NAV,
    categoryItems: headerItems.length > 0 ? headerItems : catalogCategories,
  };
}

export async function getPublicNavItems(slug: string): Promise<SiteNavItem[] | null> {
  const menu = await getMenuBySlug(slug);
  if (!menu?.items.length) return null;
  const items = mapPageItems(menu.items);
  return items.length > 0 ? items : null;
}

export async function getPublicNavItemsByPlacement(
  placement: "TOP" | "HEADER" | "FOOTER",
): Promise<SiteNavItem[] | null> {
  const menu = await getMenuByPlacement(placement);
  if (!menu?.items.length) return null;
  const items = mapNavTree(menu.items);
  return items.length > 0 ? items : null;
}
