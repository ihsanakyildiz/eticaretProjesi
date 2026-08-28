"use server";

import { revalidatePath } from "next/cache";
import type {
  SidebarLocation,
  SidebarPlacement,
  SidebarWidgetType,
} from "@prisma/client";
import { auth } from "@/auth";
import {
  SIDEBAR_LOCATIONS,
  SIDEBAR_PLACEMENTS,
  SIDEBAR_WIDGET_TYPES,
  stringifySidebarWidgetSettings,
  type SidebarWidgetSettings,
} from "@/config/site-sidebars";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { deletePublicAsset, saveOptimizedImage } from "@/lib/uploads";

export type SidebarFormState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHORIZED");
  return session;
}

function revalidateSidebars() {
  revalidatePath("/admin/sidebars");
  revalidatePath("/blog");
  revalidatePath("/yapilan-isler");
  revalidatePath("/projeler");
  revalidatePath("/");
}

async function uniqueSidebarSlug(base: string, excludeId?: string) {
  const slug = slugify(base) || "sidebar";
  let candidate = slug;
  let i = 2;
  while (true) {
    const existing = await prisma.siteSidebar.findFirst({
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

function parseLocation(raw: string): SidebarLocation | null {
  const value = raw.trim();
  if (!value) return null;
  return SIDEBAR_LOCATIONS.some((item) => item.key === value)
    ? (value as SidebarLocation)
    : null;
}

function parsePlacement(raw: string): SidebarPlacement {
  const value = raw.trim();
  return SIDEBAR_PLACEMENTS.some((item) => item.key === value)
    ? (value as SidebarPlacement)
    : "LEFT";
}

function parseWidgetType(raw: string): SidebarWidgetType | null {
  return SIDEBAR_WIDGET_TYPES.some((item) => item.key === raw)
    ? (raw as SidebarWidgetType)
    : null;
}

export async function createSidebarAction(
  _prev: SidebarFormState,
  formData: FormData,
): Promise<SidebarFormState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const location = parseLocation(String(formData.get("location") ?? ""));
  const placement = parsePlacement(String(formData.get("placement") ?? "LEFT"));
  const sortOrder = Number.parseInt(String(formData.get("sortOrder") ?? "0"), 10);
  const isActive =
    formData.get("isActive") === "on" || formData.get("isActive") === "true";

  if (!name) {
    return { error: "Sidebar adı zorunludur.", fieldErrors: { name: "Zorunlu" } };
  }

  try {
    if (location) {
      const taken = await prisma.siteSidebar.findFirst({
        where: { location, isActive: true },
        select: { id: true, name: true },
      });
      if (taken && isActive) {
        return {
          error: `“${taken.name}” zaten bu konuma atanmış. Önce onu kaldırın veya pasifleştirin.`,
        };
      }
    }

    let order = Number.isFinite(sortOrder) ? sortOrder : 0;
    if (String(formData.get("sortOrder") ?? "").trim() === "") {
      const last = await prisma.siteSidebar.findFirst({
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      order = (last?.sortOrder ?? -1) + 1;
    }

    const created = await prisma.siteSidebar.create({
      data: {
        name,
        slug: await uniqueSidebarSlug(slugInput || name),
        description: description || null,
        location,
        placement,
        sortOrder: order,
        isActive,
      },
    });

    revalidateSidebars();
    return {
      success: true,
      message: "Sidebar oluşturuldu.",
      fieldErrors: { redirectId: created.id },
    };
  } catch (error) {
    console.error("[sidebar-create]", error);
    return { error: "Sidebar oluşturulamadı." };
  }
}

export async function updateSidebarAction(
  _prev: SidebarFormState,
  formData: FormData,
): Promise<SidebarFormState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const location = parseLocation(String(formData.get("location") ?? ""));
  const placement = parsePlacement(String(formData.get("placement") ?? "LEFT"));
  const sortOrder = Number.parseInt(String(formData.get("sortOrder") ?? "0"), 10);
  const isActive =
    formData.get("isActive") === "on" || formData.get("isActive") === "true";

  if (!id) return { error: "Sidebar bulunamadı." };
  if (!name) {
    return { error: "Sidebar adı zorunludur.", fieldErrors: { name: "Zorunlu" } };
  }

  try {
    if (location && isActive) {
      const taken = await prisma.siteSidebar.findFirst({
        where: { location, isActive: true, NOT: { id } },
        select: { id: true, name: true },
      });
      if (taken) {
        return {
          error: `“${taken.name}” zaten bu konuma atanmış. Önce onu kaldırın veya pasifleştirin.`,
        };
      }
    }

    await prisma.siteSidebar.update({
      where: { id },
      data: {
        name,
        slug: await uniqueSidebarSlug(slugInput || name, id),
        description: description || null,
        location,
        placement,
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
        isActive,
      },
    });

    revalidateSidebars();
    return { success: true, message: "Sidebar güncellendi." };
  } catch (error) {
    console.error("[sidebar-update]", error);
    return { error: "Sidebar güncellenemedi." };
  }
}

export async function deleteSidebarAction(id: string): Promise<SidebarFormState> {
  try {
    await requireAdmin();
    const widgets = await prisma.siteSidebarWidget.findMany({
      where: { sidebarId: id, imagePath: { not: null } },
      select: { imagePath: true },
    });
    await prisma.siteSidebar.delete({ where: { id } });
    for (const widget of widgets) {
      if (widget.imagePath) await deletePublicAsset(widget.imagePath);
    }
    revalidateSidebars();
    return { success: true, message: "Sidebar silindi." };
  } catch (error) {
    console.error("[sidebar-delete]", error);
    return { error: "Sidebar silinemedi." };
  }
}

export async function toggleSidebarActiveAction(id: string) {
  await requireAdmin();
  const current = await prisma.siteSidebar.findUnique({
    where: { id },
    select: { isActive: true, location: true, name: true },
  });
  if (!current) throw new Error("Sidebar bulunamadı.");

  if (!current.isActive && current.location) {
    const taken = await prisma.siteSidebar.findFirst({
      where: {
        location: current.location,
        isActive: true,
        NOT: { id },
      },
      select: { name: true },
    });
    if (taken) {
      throw new Error(
        `“${taken.name}” bu konumda aktif. Önce onu pasifleştirin.`,
      );
    }
  }

  await prisma.siteSidebar.update({
    where: { id },
    data: { isActive: !current.isActive },
  });
  revalidateSidebars();
}

function parseWidgetSettings(formData: FormData): SidebarWidgetSettings {
  const showCounts = formData.get("showCounts") === "on";
  const showAllLink = formData.get("showAllLink") === "on";
  const imageLinkUrl = String(formData.get("imageLinkUrl") ?? "").trim();

  return {
    showCounts,
    showAllLink,
    imageLinkUrl: imageLinkUrl || undefined,
    contact: {
      showEmail: formData.get("contact_showEmail") === "on",
      showPhone: formData.get("contact_showPhone") === "on",
      showWhatsapp: formData.get("contact_showWhatsapp") === "on",
      showAddress: formData.get("contact_showAddress") === "on",
      showWorkingHours: formData.get("contact_showWorkingHours") === "on",
      showMap: formData.get("contact_showMap") === "on",
      introText: String(formData.get("contact_introText") ?? "").trim() || undefined,
    },
  };
}

export async function createSidebarWidgetAction(
  _prev: SidebarFormState,
  formData: FormData,
): Promise<SidebarFormState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const sidebarId = String(formData.get("sidebarId") ?? "").trim();
  const type = parseWidgetType(String(formData.get("type") ?? ""));
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const imageAlt = String(formData.get("imageAlt") ?? "").trim();
  const sortOrder = Number.parseInt(String(formData.get("sortOrder") ?? "0"), 10);
  const isActive =
    formData.get("isActive") === "on" || formData.get("isActive") === "true";

  if (!sidebarId) return { error: "Sidebar bulunamadı." };
  if (!type) return { error: "Widget türü seçin." };

  try {
    const sidebar = await prisma.siteSidebar.findUnique({
      where: { id: sidebarId },
      select: { id: true },
    });
    if (!sidebar) return { error: "Sidebar bulunamadı." };

    let imagePath: string | null = null;
    const image = formData.get("image");
    if (type === "IMAGE" && image instanceof File && image.size > 0) {
      const saved = await saveOptimizedImage(image, {
        uploadDir: "uploads/sidebars",
        maxBytes: 5 * 1024 * 1024,
      });
      imagePath = saved.publicPath;
    }

    if (type === "IMAGE" && !imagePath) {
      return { error: "Görsel widget için bir görsel yükleyin." };
    }
    if (type === "RICH_TEXT" && !content) {
      return { error: "Metin içeriği zorunludur." };
    }

    let order = Number.isFinite(sortOrder) ? sortOrder : 0;
    if (String(formData.get("sortOrder") ?? "").trim() === "") {
      const last = await prisma.siteSidebarWidget.findFirst({
        where: { sidebarId },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      order = (last?.sortOrder ?? -1) + 1;
    }

    await prisma.siteSidebarWidget.create({
      data: {
        sidebarId,
        type,
        title: title || null,
        content: type === "RICH_TEXT" ? content : null,
        imagePath,
        imageAlt: imageAlt || null,
        settings: stringifySidebarWidgetSettings(parseWidgetSettings(formData)),
        sortOrder: order,
        isActive,
      },
    });

    revalidateSidebars();
    return { success: true, message: "Widget eklendi." };
  } catch (error) {
    console.error("[sidebar-widget-create]", error);
    return { error: "Widget eklenemedi." };
  }
}

export async function updateSidebarWidgetAction(
  _prev: SidebarFormState,
  formData: FormData,
): Promise<SidebarFormState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const id = String(formData.get("id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const imageAlt = String(formData.get("imageAlt") ?? "").trim();
  const sortOrder = Number.parseInt(String(formData.get("sortOrder") ?? "0"), 10);
  const isActive =
    formData.get("isActive") === "on" || formData.get("isActive") === "true";
  const removeImage = formData.get("removeImage") === "1";

  if (!id) return { error: "Widget bulunamadı." };

  try {
    const current = await prisma.siteSidebarWidget.findUnique({
      where: { id },
    });
    if (!current) return { error: "Widget bulunamadı." };

    let imagePath = current.imagePath;
    const image = formData.get("image");
    if (current.type === "IMAGE") {
      if (removeImage && imagePath) {
        await deletePublicAsset(imagePath);
        imagePath = null;
      }
      if (image instanceof File && image.size > 0) {
        const saved = await saveOptimizedImage(image, {
          uploadDir: "uploads/sidebars",
          maxBytes: 5 * 1024 * 1024,
          previousPath: imagePath ?? undefined,
        });
        imagePath = saved.publicPath;
      }
      if (!imagePath) {
        return { error: "Görsel widget için bir görsel gerekli." };
      }
    }

    if (current.type === "RICH_TEXT" && !content) {
      return { error: "Metin içeriği zorunludur." };
    }

    await prisma.siteSidebarWidget.update({
      where: { id },
      data: {
        title: title || null,
        content: current.type === "RICH_TEXT" ? content : current.content,
        imagePath,
        imageAlt: imageAlt || null,
        settings: stringifySidebarWidgetSettings(parseWidgetSettings(formData)),
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : current.sortOrder,
        isActive,
      },
    });

    revalidateSidebars();
    return { success: true, message: "Widget güncellendi." };
  } catch (error) {
    console.error("[sidebar-widget-update]", error);
    return { error: "Widget güncellenemedi." };
  }
}

export async function deleteSidebarWidgetAction(
  id: string,
): Promise<SidebarFormState> {
  try {
    await requireAdmin();
    const widget = await prisma.siteSidebarWidget.findUnique({
      where: { id },
      select: { imagePath: true },
    });
    await prisma.siteSidebarWidget.delete({ where: { id } });
    if (widget?.imagePath) await deletePublicAsset(widget.imagePath);
    revalidateSidebars();
    return { success: true, message: "Widget silindi." };
  } catch (error) {
    console.error("[sidebar-widget-delete]", error);
    return { error: "Widget silinemedi." };
  }
}

export async function reorderSidebarWidgetsAction(
  sidebarId: string,
  orderedIds: string[],
) {
  await requireAdmin();
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.siteSidebarWidget.updateMany({
        where: { id, sidebarId },
        data: { sortOrder: index },
      }),
    ),
  );
  revalidateSidebars();
}
