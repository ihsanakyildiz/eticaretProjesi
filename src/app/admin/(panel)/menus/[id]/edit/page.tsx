import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildCategoryTree, flattenCategoryTree } from "@/lib/category-tree";
import {
  menuItemLinkSummary,
  type MenuItemWithLinks,
} from "@/lib/menus";
import { prisma } from "@/lib/prisma";
import { MenuGroupForm } from "../../menu-group-form";
import { MenuItemsPanel, type MenuItemRow } from "../../menu-items-panel";

type EditMenuGroupPageProps = {
  params: Promise<{ id: string }>;
};

function targetIdFromItem(item: MenuItemWithLinks): string | null {
  switch (item.linkType) {
    case "CUSTOM":
      return null;
    case "PAGE":
      return item.pageId;
    case "WORK_CATEGORY":
      return item.workCategoryId;
    case "WORK":
      return item.workId;
    case "PROJECT_CATEGORY":
      return item.projectCategoryId;
    case "PROJECT":
      return item.projectId;
    case "BLOG_CATEGORY":
      return item.blogCategoryId;
    case "BLOG_POST":
      return item.blogPostId;
    default: {
      const _exhaustive: never = item.linkType;
      return _exhaustive;
    }
  }
}

export async function generateMetadata({
  params,
}: EditMenuGroupPageProps): Promise<Metadata> {
  const { id } = await params;
  const group = await prisma.menuGroup.findUnique({
    where: { id },
    select: { name: true },
  });
  return { title: group ? `Düzenle: ${group.name}` : "Menü Düzenle" };
}

export default async function EditMenuGroupPage({ params }: EditMenuGroupPageProps) {
  const { id } = await params;

  const [
    group,
    pages,
    workCategories,
    works,
    projectCategories,
    projects,
    blogCategories,
    blogPosts,
  ] = await Promise.all([
    prisma.menuGroup.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          include: {
            page: { select: { id: true, title: true, slug: true } },
            workCategory: { select: { id: true, name: true, slug: true } },
            work: { select: { id: true, title: true, slug: true } },
            projectCategory: { select: { id: true, name: true, slug: true } },
            project: { select: { id: true, title: true, slug: true } },
            blogCategory: { select: { id: true, name: true, slug: true } },
            blogPost: { select: { id: true, title: true, slug: true } },
          },
        },
      },
    }),
    prisma.page.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: { id: true, title: true, slug: true },
    }),
    prisma.workCategory.findMany({
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
    prisma.work.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: { id: true, title: true, slug: true },
    }),
    prisma.projectCategory.findMany({
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
    prisma.project.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: { id: true, title: true, slug: true },
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
    prisma.blogPost.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: { id: true, title: true, slug: true },
    }),
  ]);

  if (!group) notFound();

  const workCatFlat = flattenCategoryTree(buildCategoryTree(workCategories));
  const projectCatFlat = flattenCategoryTree(buildCategoryTree(projectCategories));
  const blogCatFlat = flattenCategoryTree(buildCategoryTree(blogCategories));

  const items: MenuItemRow[] = group.items.map((item) => ({
    id: item.id,
    parentId: item.parentId,
    label: item.label,
    linkType: item.linkType,
    href: item.href,
    description: item.description,
    openInNewTab: item.openInNewTab,
    isActive: item.isActive,
    sortOrder: item.sortOrder,
    targetId: targetIdFromItem(item),
    linkSummary: menuItemLinkSummary(item),
  }));

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Menüler</p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">
          Menü Grubunu Düzenle
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {group.name} · /{group.slug}
        </p>
      </div>

      <MenuItemsPanel
        groupId={group.id}
        groupName={group.name}
        items={items}
        linkOptions={{
          pages: pages.map((page) => ({
            id: page.id,
            label: page.title,
            searchText: `${page.title} ${page.slug}`,
          })),
          workCategories: workCatFlat.map((item) => ({
            id: item.id,
            label: item.name,
            depth: item.depth,
            searchText: item.name,
          })),
          works: works.map((work) => ({
            id: work.id,
            label: work.title,
            searchText: `${work.title} ${work.slug}`,
          })),
          projectCategories: projectCatFlat.map((item) => ({
            id: item.id,
            label: item.name,
            depth: item.depth,
            searchText: item.name,
          })),
          projects: projects.map((project) => ({
            id: project.id,
            label: project.title,
            searchText: `${project.title} ${project.slug}`,
          })),
          blogCategories: blogCatFlat.map((item) => ({
            id: item.id,
            label: item.name,
            depth: item.depth,
            searchText: item.name,
          })),
          blogPosts: blogPosts.map((post) => ({
            id: post.id,
            label: post.title,
            searchText: `${post.title} ${post.slug}`,
          })),
        }}
      />

      <MenuGroupForm
        mode="edit"
        initial={{
          id: group.id,
          name: group.name,
          slug: group.slug,
          description: group.description ?? "",
          sortOrder: group.sortOrder,
          isActive: group.isActive,
        }}
      />
    </div>
  );
}
