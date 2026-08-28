"use server";

import type { MenuLinkType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { MENU_LINK_TYPES } from "@/lib/menus";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

export type MenuFormState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export type DeleteMenuResult = {
  success?: boolean;
  error?: string;
  message?: string;
};

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHORIZED");
  return session;
}

async function uniqueMenuGroupSlug(base: string, excludeId?: string) {
  const slug = slugify(base) || "menu";
  let candidate = slug;
  let i = 2;
  while (true) {
    const existing = await prisma.menuGroup.findFirst({
      where: {
        slug: candidate,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (!existing) return candidate;
    candidate = `${slug}-${i}`;
    i += 1;
  }
}

function parseGroupPayload(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const sortOrder = Number.parseInt(String(formData.get("sortOrder") ?? "0"), 10);
  const isActive = formData.get("isActive") === "on" || formData.get("isActive") === "true";

  return {
    name,
    slugInput,
    description,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    isActive,
  };
}

function isMenuLinkType(value: string): value is MenuLinkType {
  return (MENU_LINK_TYPES as string[]).includes(value);
}

function emptyRefs() {
  return {
    pageId: null as string | null,
    workCategoryId: null as string | null,
    workId: null as string | null,
    projectCategoryId: null as string | null,
    projectId: null as string | null,
    blogCategoryId: null as string | null,
    blogPostId: null as string | null,
  };
}

function parseItemPayload(formData: FormData) {
  const label = String(formData.get("label") ?? "").trim();
  const linkTypeRaw = String(formData.get("linkType") ?? "CUSTOM").trim();
  const href = String(formData.get("href") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const parentIdRaw = String(formData.get("parentId") ?? "").trim();
  const sortOrder = Number.parseInt(String(formData.get("sortOrder") ?? "0"), 10);
  const isActive = formData.get("isActive") === "on" || formData.get("isActive") === "true";
  const openInNewTab =
    formData.get("openInNewTab") === "on" || formData.get("openInNewTab") === "true";

  const linkType: MenuLinkType = isMenuLinkType(linkTypeRaw) ? linkTypeRaw : "CUSTOM";
  const refs = emptyRefs();
  const targetId = String(formData.get("targetId") ?? "").trim() || null;

  switch (linkType) {
    case "CUSTOM":
      break;
    case "PAGE":
      refs.pageId = targetId;
      break;
    case "WORK_CATEGORY":
      refs.workCategoryId = targetId;
      break;
    case "WORK":
      refs.workId = targetId;
      break;
    case "PROJECT_CATEGORY":
      refs.projectCategoryId = targetId;
      break;
    case "PROJECT":
      refs.projectId = targetId;
      break;
    case "BLOG_CATEGORY":
      refs.blogCategoryId = targetId;
      break;
    case "BLOG_POST":
      refs.blogPostId = targetId;
      break;
    default: {
      const _exhaustive: never = linkType;
      void _exhaustive;
    }
  }

  return {
    label,
    linkType,
    href: href || null,
    description: description || null,
    parentId: parentIdRaw || null,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    isActive,
    openInNewTab,
    ...refs,
  };
}

function validateItemTarget(data: ReturnType<typeof parseItemPayload>): string | null {
  if (!data.label) return "Menü başlığı zorunludur.";
  if (data.linkType === "CUSTOM" && !data.href) {
    return "Özel link için URL zorunludur.";
  }
  if (data.linkType === "PAGE" && !data.pageId) return "Sayfa seçin.";
  if (data.linkType === "WORK_CATEGORY" && !data.workCategoryId) return "İş kategorisi seçin.";
  if (data.linkType === "WORK" && !data.workId) return "Çalışma seçin.";
  if (data.linkType === "PROJECT_CATEGORY" && !data.projectCategoryId) {
    return "Proje kategorisi seçin.";
  }
  if (data.linkType === "PROJECT" && !data.projectId) return "Proje seçin.";
  if (data.linkType === "BLOG_CATEGORY" && !data.blogCategoryId) return "Blog kategorisi seçin.";
  if (data.linkType === "BLOG_POST" && !data.blogPostId) return "Blog yazısı seçin.";
  return null;
}

async function assertValidParent(
  groupId: string,
  parentId: string | null,
  selfId?: string,
): Promise<string | null> {
  if (!parentId) return null;
  if (selfId && parentId === selfId) return "Bir öğe kendisinin altına taşınamaz.";

  const parent = await prisma.menuItem.findFirst({
    where: { id: parentId, groupId },
    select: { id: true },
  });
  if (!parent) return "Üst menü bulunamadı.";

  if (selfId) {
    const descendants = await collectDescendantIds(selfId);
    if (descendants.has(parentId)) {
      return "Bir öğe kendi alt menüsünün altına taşınamaz.";
    }
  }
  return null;
}

async function collectDescendantIds(rootId: string): Promise<Set<string>> {
  const root = await prisma.menuItem.findUnique({
    where: { id: rootId },
    select: { id: true, groupId: true },
  });
  if (!root) return new Set();

  const groupItems = await prisma.menuItem.findMany({
    where: { groupId: root.groupId },
    select: { id: true, parentId: true },
  });

  const byParent = new Map<string | null, string[]>();
  for (const item of groupItems) {
    const list = byParent.get(item.parentId) ?? [];
    list.push(item.id);
    byParent.set(item.parentId, list);
  }

  const result = new Set<string>();
  const stack = [...(byParent.get(rootId) ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    if (result.has(id)) continue;
    result.add(id);
    stack.push(...(byParent.get(id) ?? []));
  }
  return result;
}

function revalidateMenus(groupId?: string) {
  revalidatePath("/admin/menus");
  if (groupId) revalidatePath(`/admin/menus/${groupId}/edit`);
}

export async function createMenuGroupAction(
  _prev: MenuFormState,
  formData: FormData,
): Promise<MenuFormState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const data = parseGroupPayload(formData);
  if (!data.name) {
    return { error: "Menü adı zorunludur.", fieldErrors: { name: "Zorunlu alan" } };
  }

  try {
    const slug = await uniqueMenuGroupSlug(data.slugInput || data.name);
    let sortOrder = data.sortOrder;
    const sortOrderRaw = String(formData.get("sortOrder") ?? "").trim();
    if (sortOrderRaw === "") {
      const last = await prisma.menuGroup.findFirst({
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      sortOrder = (last?.sortOrder ?? -1) + 1;
    }

    const created = await prisma.menuGroup.create({
      data: {
        name: data.name,
        slug,
        description: data.description || null,
        sortOrder,
        isActive: data.isActive,
      },
    });

    revalidateMenus(created.id);
    return {
      success: true,
      message: "Menü grubu oluşturuldu.",
      fieldErrors: { redirectId: created.id },
    };
  } catch (error) {
    console.error(error);
    return { error: "Menü grubu oluşturulamadı." };
  }
}

export async function updateMenuGroupAction(
  _prev: MenuFormState,
  formData: FormData,
): Promise<MenuFormState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Geçersiz menü." };

  const data = parseGroupPayload(formData);
  if (!data.name) {
    return { error: "Menü adı zorunludur.", fieldErrors: { name: "Zorunlu alan" } };
  }

  try {
    const slug = await uniqueMenuGroupSlug(data.slugInput || data.name, id);
    await prisma.menuGroup.update({
      where: { id },
      data: {
        name: data.name,
        slug,
        description: data.description || null,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
      },
    });
    revalidateMenus(id);
    return { success: true, message: "Menü grubu güncellendi." };
  } catch (error) {
    console.error(error);
    return { error: "Menü grubu güncellenemedi." };
  }
}

export async function deleteMenuGroupAction(formData: FormData): Promise<DeleteMenuResult> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Geçersiz menü." };

  try {
    await prisma.menuGroup.delete({ where: { id } });
    revalidateMenus();
    return { success: true, message: "Menü grubu silindi." };
  } catch (error) {
    console.error(error);
    return { error: "Menü grubu silinemedi." };
  }
}

export async function toggleMenuGroupActiveAction(formData: FormData) {
  try {
    await requireAdmin();
  } catch {
    return;
  }
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const current = await prisma.menuGroup.findUnique({
    where: { id },
    select: { isActive: true },
  });
  if (!current) return;
  await prisma.menuGroup.update({
    where: { id },
    data: { isActive: !current.isActive },
  });
  revalidateMenus(id);
}

export async function createMenuItemAction(
  _prev: MenuFormState,
  formData: FormData,
): Promise<MenuFormState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const groupId = String(formData.get("groupId") ?? "").trim();
  if (!groupId) return { error: "Menü grubu bulunamadı." };

  const data = parseItemPayload(formData);
  const validationError = validateItemTarget(data);
  if (validationError) {
    return { error: validationError, fieldErrors: { label: validationError } };
  }

  const parentError = await assertValidParent(groupId, data.parentId);
  if (parentError) return { error: parentError };

  try {
    let sortOrder = data.sortOrder;
    const sortOrderRaw = String(formData.get("sortOrder") ?? "").trim();
    if (sortOrderRaw === "") {
      const last = await prisma.menuItem.findFirst({
        where: { groupId, parentId: data.parentId },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      sortOrder = (last?.sortOrder ?? -1) + 1;
    }

    await prisma.menuItem.create({
      data: {
        groupId,
        parentId: data.parentId,
        label: data.label,
        linkType: data.linkType,
        href: data.href,
        description: data.description,
        openInNewTab: data.openInNewTab,
        pageId: data.pageId,
        workCategoryId: data.workCategoryId,
        workId: data.workId,
        projectCategoryId: data.projectCategoryId,
        projectId: data.projectId,
        blogCategoryId: data.blogCategoryId,
        blogPostId: data.blogPostId,
        sortOrder,
        isActive: data.isActive,
      },
    });

    revalidateMenus(groupId);
    return {
      success: true,
      message: "Menü öğesi eklendi.",
      fieldErrors: { redirectGroupId: groupId },
    };
  } catch (error) {
    console.error(error);
    return { error: "Menü öğesi eklenemedi." };
  }
}

export async function updateMenuItemAction(
  _prev: MenuFormState,
  formData: FormData,
): Promise<MenuFormState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const id = String(formData.get("id") ?? "").trim();
  const groupId = String(formData.get("groupId") ?? "").trim();
  if (!id || !groupId) return { error: "Geçersiz menü öğesi." };

  const data = parseItemPayload(formData);
  const validationError = validateItemTarget(data);
  if (validationError) {
    return { error: validationError, fieldErrors: { label: validationError } };
  }

  const parentError = await assertValidParent(groupId, data.parentId, id);
  if (parentError) return { error: parentError };

  try {
    await prisma.menuItem.update({
      where: { id },
      data: {
        parentId: data.parentId,
        label: data.label,
        linkType: data.linkType,
        href: data.href,
        description: data.description,
        openInNewTab: data.openInNewTab,
        pageId: data.pageId,
        workCategoryId: data.workCategoryId,
        workId: data.workId,
        projectCategoryId: data.projectCategoryId,
        projectId: data.projectId,
        blogCategoryId: data.blogCategoryId,
        blogPostId: data.blogPostId,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
      },
    });
    revalidateMenus(groupId);
    return {
      success: true,
      message: "Menü öğesi güncellendi.",
      fieldErrors: { redirectGroupId: groupId },
    };
  } catch (error) {
    console.error(error);
    return { error: "Menü öğesi güncellenemedi." };
  }
}

export async function deleteMenuItemAction(formData: FormData): Promise<DeleteMenuResult> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Geçersiz menü öğesi." };

  try {
    const item = await prisma.menuItem.findUnique({
      where: { id },
      select: { groupId: true },
    });
    if (!item) return { error: "Menü öğesi bulunamadı." };
    await prisma.menuItem.delete({ where: { id } });
    revalidateMenus(item.groupId);
    return { success: true, message: "Menü öğesi silindi." };
  } catch (error) {
    console.error(error);
    return { error: "Menü öğesi silinemedi." };
  }
}

export async function toggleMenuItemActiveAction(formData: FormData) {
  try {
    await requireAdmin();
  } catch {
    return;
  }
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const current = await prisma.menuItem.findUnique({
    where: { id },
    select: { isActive: true, groupId: true },
  });
  if (!current) return;
  await prisma.menuItem.update({
    where: { id },
    data: { isActive: !current.isActive },
  });
  revalidateMenus(current.groupId);
}

export type MenuItemOrderUpdate = {
  id: string;
  parentId: string | null;
  sortOrder: number;
};

export async function reorderMenuItemsAction(
  groupId: string,
  updates: MenuItemOrderUpdate[],
): Promise<DeleteMenuResult> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  if (!groupId || updates.length === 0) {
    return { error: "Geçersiz sıralama." };
  }

  try {
    const existing = await prisma.menuItem.findMany({
      where: { groupId },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((item) => item.id));
    for (const update of updates) {
      if (!existingIds.has(update.id)) {
        return { error: "Geçersiz menü öğesi." };
      }
      if (update.parentId && !existingIds.has(update.parentId)) {
        return { error: "Geçersiz üst menü." };
      }
      if (update.parentId === update.id) {
        return { error: "Bir öğe kendisinin altına taşınamaz." };
      }
    }

    await prisma.$transaction(
      updates.map((update) =>
        prisma.menuItem.update({
          where: { id: update.id },
          data: {
            parentId: update.parentId,
            sortOrder: update.sortOrder,
          },
        }),
      ),
    );

    revalidateMenus(groupId);
    return { success: true, message: "Menü sırası güncellendi." };
  } catch (error) {
    console.error(error);
    return { error: "Sıralama kaydedilemedi." };
  }
}
