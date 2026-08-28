"use server";

import { revalidatePath } from "next/cache";
import { bustProjectCache } from "@/lib/projects";
import { auth } from "@/auth";
import { normalizeProjectUrl } from "@/lib/project-portfolio";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import {
  deletePublicAsset,
  saveOptimizedImage,
  uploadLimits,
} from "@/lib/uploads";

export type ProjectClientFormState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export type DeleteProjectClientResult = {
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

async function uniqueProjectClientSlug(base: string, excludeId?: string) {
  const slug = slugify(base) || "musteri";
  let candidate = slug;
  let i = 2;

  while (true) {
    const existing = await prisma.projectClient.findFirst({
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

function parseClientPayload(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const sector = String(formData.get("sector") ?? "").trim().slice(0, 191);
  const description = String(formData.get("description") ?? "").trim();
  const website = normalizeProjectUrl(String(formData.get("website") ?? ""));
  const sortOrderRaw = String(formData.get("sortOrder") ?? "").trim();
  const sortOrderParsed = Number.parseInt(sortOrderRaw, 10);
  const isActive = formData.get("isActive") === "on" || formData.get("isActive") === "true";
  const existingLogo = String(formData.get("logo") ?? "").trim();
  const logoFile = formData.get("logo_file");

  return {
    name,
    slugInput,
    sector,
    description,
    website,
    sortOrderRaw,
    sortOrder: Number.isFinite(sortOrderParsed) ? sortOrderParsed : null,
    isActive,
    existingLogo,
    logoFile,
  };
}

export async function createProjectClientAction(
  _prev: ProjectClientFormState,
  formData: FormData,
): Promise<ProjectClientFormState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const payload = parseClientPayload(formData);
  if (!payload.name) {
    return { error: "Müşteri adı zorunludur.", fieldErrors: { name: "Zorunlu alan" } };
  }

  try {
    const slug = await uniqueProjectClientSlug(payload.slugInput || payload.name);
    let sortOrder = payload.sortOrder;
    if (sortOrder === null || payload.sortOrderRaw === "") {
      const last = await prisma.projectClient.findFirst({
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      sortOrder = (last?.sortOrder ?? -1) + 1;
    }

    let logo = payload.existingLogo;
    if (payload.logoFile instanceof File && payload.logoFile.size > 0) {
      const saved = await saveOptimizedImage(payload.logoFile, {
        uploadDir: "uploads/projects/clients",
        maxBytes: uploadLimits.image,
        mode: "webp",
        quality: 82,
      });
      logo = saved.publicPath;
    }

    await prisma.projectClient.create({
      data: {
        name: payload.name,
        slug,
        sector: payload.sector || null,
        description: payload.description || null,
        website: payload.website,
        logo: logo || null,
        sortOrder,
        isActive: payload.isActive,
      },
    });

    bustProjectCache();
    revalidatePath("/admin/projects/clients");
    revalidatePath("/admin/projects");
    return { success: true, message: "Müşteri oluşturuldu." };
  } catch (error) {
    console.error(error);
    return { error: "Müşteri oluşturulurken bir hata oluştu." };
  }
}

export async function updateProjectClientAction(
  _prev: ProjectClientFormState,
  formData: FormData,
): Promise<ProjectClientFormState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Müşteri bulunamadı." };

  const existing = await prisma.projectClient.findUnique({ where: { id } });
  if (!existing) return { error: "Müşteri bulunamadı." };

  const payload = parseClientPayload(formData);
  if (!payload.name) {
    return { error: "Müşteri adı zorunludur.", fieldErrors: { name: "Zorunlu alan" } };
  }

  try {
    const slug = await uniqueProjectClientSlug(payload.slugInput || payload.name, id);
    const sortOrder =
      payload.sortOrderRaw === "" || payload.sortOrder === null
        ? existing.sortOrder
        : payload.sortOrder;

    let logo = payload.existingLogo;
    if (payload.logoFile instanceof File && payload.logoFile.size > 0) {
      const saved = await saveOptimizedImage(payload.logoFile, {
        uploadDir: "uploads/projects/clients",
        maxBytes: uploadLimits.image,
        mode: "webp",
        quality: 82,
        previousPath: existing.logo || undefined,
      });
      logo = saved.publicPath;
    } else if (!logo && existing.logo) {
      await deletePublicAsset(existing.logo);
      logo = "";
    }

    await prisma.projectClient.update({
      where: { id },
      data: {
        name: payload.name,
        slug,
        sector: payload.sector || null,
        description: payload.description || null,
        website: payload.website,
        logo: logo || null,
        sortOrder,
        isActive: payload.isActive,
      },
    });

    bustProjectCache();
    revalidatePath("/admin/projects/clients");
    revalidatePath(`/admin/projects/clients/${id}/edit`);
    revalidatePath("/admin/projects");
    return { success: true, message: "Müşteri güncellendi." };
  } catch (error) {
    console.error(error);
    return { error: "Müşteri güncellenirken bir hata oluştu." };
  }
}

export async function deleteProjectClientAction(input: {
  id: string;
}): Promise<DeleteProjectClientResult> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const id = String(input.id ?? "").trim();
  if (!id) return { error: "Müşteri bulunamadı." };

  const existing = await prisma.projectClient.findUnique({
    where: { id },
    include: { _count: { select: { projects: true } } },
  });
  if (!existing) return { error: "Müşteri bulunamadı." };

  try {
    await prisma.projectClient.delete({ where: { id } });
    if (existing.logo) await deletePublicAsset(existing.logo);

    bustProjectCache();
    revalidatePath("/admin/projects/clients");
    revalidatePath("/admin/projects");
    return {
      success: true,
      message:
        existing._count.projects > 0
          ? `Müşteri silindi; ${existing._count.projects} projeden bağlantı kaldırıldı.`
          : "Müşteri silindi.",
    };
  } catch (error) {
    console.error(error);
    return { error: "Müşteri silinirken bir hata oluştu." };
  }
}

export async function toggleProjectClientActiveAction(input: {
  id: string;
  isActive: boolean;
}): Promise<DeleteProjectClientResult> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const id = String(input.id ?? "").trim();
  if (!id) return { error: "Müşteri bulunamadı." };

  const existing = await prisma.projectClient.findUnique({ where: { id } });
  if (!existing) return { error: "Müşteri bulunamadı." };

  await prisma.projectClient.update({
    where: { id },
    data: { isActive: input.isActive },
  });

  bustProjectCache();
  revalidatePath("/admin/projects/clients");
  revalidatePath("/admin/projects");
  return {
    success: true,
    message: input.isActive ? "Müşteri aktif edildi." : "Müşteri pasife alındı.",
  };
}
