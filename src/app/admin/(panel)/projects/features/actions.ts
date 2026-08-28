"use server";

import { revalidatePath } from "next/cache";
import { bustProjectCache } from "@/lib/projects";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

export type ProjectFeatureFormState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export type DeleteProjectFeatureResult = {
  success?: boolean;
  error?: string;
  message?: string;
};

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

function revalidateFeaturePublicPaths(slug?: string) {
  bustProjectCache();
  revalidatePath("/admin/projects/features");
  revalidatePath("/admin/projects");
  revalidatePath("/");
  revalidatePath("/projeler");
  revalidatePath("/projeler/etiket");
  if (slug) revalidatePath(`/projeler/etiket/${slug}`);
}

async function uniqueProjectFeatureSlug(base: string, excludeId?: string) {
  const slug = slugify(base) || "ozellik";
  let candidate = slug;
  let i = 2;

  while (true) {
    const existing = await prisma.projectFeature.findFirst({
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

function parseFeaturePayload(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const icon = String(formData.get("icon") ?? "").trim().slice(0, 100);
  const iconColorRaw = String(formData.get("iconColor") ?? "").trim();
  const iconColorMatch = iconColorRaw.match(/^#?[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/);
  let iconColor: string | null = null;
  if (iconColorMatch) {
    const withHash = iconColorRaw.startsWith("#") ? iconColorRaw : `#${iconColorRaw}`;
    if (withHash.length === 4) {
      const [, a, b, c] = withHash;
      iconColor = `#${a}${a}${b}${b}${c}${c}`.toLowerCase();
    } else {
      iconColor = withHash.toLowerCase();
    }
  }
  const sortOrderRaw = String(formData.get("sortOrder") ?? "").trim();
  const sortOrderParsed = Number.parseInt(sortOrderRaw, 10);
  const isActive = formData.get("isActive") === "on" || formData.get("isActive") === "true";
  const showOnHome =
    formData.get("showOnHome") === "on" || formData.get("showOnHome") === "true";

  return {
    name,
    slugInput,
    description,
    icon,
    iconColor,
    sortOrderRaw,
    sortOrder: Number.isFinite(sortOrderParsed) ? sortOrderParsed : null,
    isActive,
    showOnHome,
  };
}

export async function createProjectFeatureAction(
  _prev: ProjectFeatureFormState,
  formData: FormData,
): Promise<ProjectFeatureFormState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const payload = parseFeaturePayload(formData);
  const fieldErrors: Record<string, string> = {};

  if (!payload.name) fieldErrors.name = "Özellik adı zorunludur.";
  if (Object.keys(fieldErrors).length > 0) {
    return { error: "Lütfen formu kontrol edin.", fieldErrors };
  }

  try {
    const slug = await uniqueProjectFeatureSlug(payload.slugInput || payload.name);
    let sortOrder = payload.sortOrder;
    if (sortOrder === null || payload.sortOrderRaw === "") {
      const last = await prisma.projectFeature.findFirst({
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      sortOrder = (last?.sortOrder ?? -1) + 1;
    }

    await prisma.projectFeature.create({
      data: {
        name: payload.name,
        slug,
        description: payload.description || null,
        icon: payload.icon || null,
        iconColor: payload.iconColor,
        sortOrder,
        isActive: payload.isActive,
        showOnHome: payload.showOnHome,
      },
    });

    revalidateFeaturePublicPaths(slug);
    return { success: true, message: "Özellik oluşturuldu." };
  } catch (error) {
    console.error(error);
    return { error: "Özellik oluşturulurken bir hata oluştu." };
  }
}

export async function updateProjectFeatureAction(
  _prev: ProjectFeatureFormState,
  formData: FormData,
): Promise<ProjectFeatureFormState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Özellik bulunamadı." };

  const existing = await prisma.projectFeature.findUnique({ where: { id } });
  if (!existing) return { error: "Özellik bulunamadı." };

  const payload = parseFeaturePayload(formData);
  const fieldErrors: Record<string, string> = {};

  if (!payload.name) fieldErrors.name = "Özellik adı zorunludur.";
  if (Object.keys(fieldErrors).length > 0) {
    return { error: "Lütfen formu kontrol edin.", fieldErrors };
  }

  try {
    const slug = await uniqueProjectFeatureSlug(payload.slugInput || payload.name, id);
    const sortOrder =
      payload.sortOrderRaw === "" || payload.sortOrder === null
        ? existing.sortOrder
        : payload.sortOrder;

    await prisma.projectFeature.update({
      where: { id },
      data: {
        name: payload.name,
        slug,
        description: payload.description || null,
        icon: payload.icon || null,
        iconColor: payload.iconColor,
        sortOrder,
        isActive: payload.isActive,
        showOnHome: payload.showOnHome,
      },
    });

    revalidateFeaturePublicPaths(slug);
    revalidatePath(`/admin/projects/features/${id}/edit`);
    return { success: true, message: "Özellik güncellendi." };
  } catch (error) {
    console.error(error);
    return { error: "Özellik güncellenirken bir hata oluştu." };
  }
}

export async function deleteProjectFeatureAction(input: {
  id: string;
}): Promise<DeleteProjectFeatureResult> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const id = String(input.id ?? "").trim();
  if (!id) return { error: "Özellik bulunamadı." };

  const existing = await prisma.projectFeature.findUnique({
    where: { id },
    include: { _count: { select: { projects: true } } },
  });
  if (!existing) return { error: "Özellik bulunamadı." };

  try {
    await prisma.projectFeature.delete({ where: { id } });
    revalidateFeaturePublicPaths(existing.slug);
    return {
      success: true,
      message:
        existing._count.projects > 0
          ? `Özellik silindi; ${existing._count.projects} projeden kaldırıldı.`
          : "Özellik silindi.",
    };
  } catch (error) {
    console.error(error);
    return { error: "Özellik silinirken bir hata oluştu." };
  }
}

export async function toggleProjectFeatureActiveAction(input: {
  id: string;
  isActive: boolean;
}): Promise<DeleteProjectFeatureResult> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const id = String(input.id ?? "").trim();
  if (!id) return { error: "Özellik bulunamadı." };

  const existing = await prisma.projectFeature.findUnique({ where: { id } });
  if (!existing) return { error: "Özellik bulunamadı." };

  await prisma.projectFeature.update({
    where: { id },
    data: { isActive: input.isActive },
  });

  revalidateFeaturePublicPaths(existing.slug);
  return {
    success: true,
    message: input.isActive ? "Özellik aktif edildi." : "Özellik pasife alındı.",
  };
}
