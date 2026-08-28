"use server";

import { revalidatePath } from "next/cache";
import { bustWorkCache } from "@/lib/works";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveWorkSeo, SEO_DESCRIPTION_MAX, SEO_TITLE_MAX } from "@/lib/seo";
import { slugify } from "@/lib/slug";
import {
  deletePublicAsset,
  saveOptimizedImage,
  uploadLimits,
} from "@/lib/uploads";

export type WorkFormState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export type DeleteWorkResult = {
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

async function uniqueWorkSlug(base: string, excludeId?: string) {
  const slug = slugify(base) || "calisma";
  let candidate = slug;
  let i = 2;

  while (true) {
    const existing = await prisma.work.findFirst({
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

function revalidateWorkPublic(slug?: string | null) {
  bustWorkCache();
  revalidatePath("/admin/works");
  revalidatePath("/admin/works/categories");
  revalidatePath("/admin/projects");
  revalidatePath("/");
  revalidatePath("/yapilan-isler");
  revalidatePath("/yapilan-isler/kategori");
  if (slug) revalidatePath(`/yapilan-isler/${slug}`);
}

async function assertValidCategory(categoryId: string | null) {
  if (!categoryId) return null;

  const category = await prisma.workCategory.findUnique({
    where: { id: categoryId },
    select: { id: true },
  });
  if (!category) {
    throw new Error("CATEGORY_NOT_FOUND");
  }

  return categoryId;
}

async function resolveProjectIds(rawIds: string[]) {
  const unique = [...new Set(rawIds.map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0) return [] as string[];

  const found = await prisma.project.findMany({
    where: { id: { in: unique } },
    select: { id: true },
  });

  if (found.length !== unique.length) {
    throw new Error("PROJECT_NOT_FOUND");
  }

  return found.map((project) => project.id);
}

function parseWorkPayload(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const seoTitle = String(formData.get("seoTitle") ?? "").trim();
  const seoDescription = String(formData.get("seoDescription") ?? "").trim();
  const categoryIdRaw = String(formData.get("categoryId") ?? "").trim();
  const sortOrder = Number.parseInt(String(formData.get("sortOrder") ?? "0"), 10);
  const isActive = formData.get("isActive") === "on" || formData.get("isActive") === "true";
  const existingImage = String(formData.get("image") ?? "").trim();
  const imageFile = formData.get("image_file");
  const existingPreviewImage = String(formData.get("previewImage") ?? "").trim();
  const previewImageFile = formData.get("preview_image_file");
  const projectIds = formData
    .getAll("projectIds")
    .map((value) => String(value).trim())
    .filter(Boolean);

  return {
    title,
    slugInput,
    summary,
    content,
    seoTitle,
    seoDescription,
    categoryId: categoryIdRaw || null,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    isActive,
    existingImage,
    imageFile,
    existingPreviewImage,
    previewImageFile,
    projectIds,
  };
}

export async function createWorkAction(
  _prev: WorkFormState,
  formData: FormData,
): Promise<WorkFormState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const data = parseWorkPayload(formData);
  if (!data.title) {
    return { error: "Başlık zorunludur.", fieldErrors: { title: "Zorunlu alan" } };
  }
  if (data.seoTitle.length > SEO_TITLE_MAX) {
    return {
      error: `SEO başlığı en fazla ${SEO_TITLE_MAX} karakter olabilir.`,
      fieldErrors: { seoTitle: `En fazla ${SEO_TITLE_MAX} karakter` },
    };
  }
  if (data.seoDescription.length > SEO_DESCRIPTION_MAX) {
    return {
      error: `SEO açıklaması en fazla ${SEO_DESCRIPTION_MAX} karakter olabilir.`,
      fieldErrors: { seoDescription: `En fazla ${SEO_DESCRIPTION_MAX} karakter` },
    };
  }

  try {
    const categoryId = await assertValidCategory(data.categoryId);
    const projectIds = await resolveProjectIds(data.projectIds);
    const slug = await uniqueWorkSlug(data.slugInput || data.title);
    let image = data.existingImage;
    let previewImage = data.existingPreviewImage;

    if (data.imageFile instanceof File && data.imageFile.size > 0) {
      const saved = await saveOptimizedImage(data.imageFile, {
        uploadDir: "uploads/works",
        maxBytes: uploadLimits.image,
        mode: "webp",
        quality: 82,
      });
      image = saved.publicPath;
    }

    if (data.previewImageFile instanceof File && data.previewImageFile.size > 0) {
      const saved = await saveOptimizedImage(data.previewImageFile, {
        uploadDir: "uploads/works",
        maxBytes: 12 * 1024 * 1024,
        mode: "webp",
        quality: 78,
        width: 1440,
        height: 20000,
        fit: "inside",
      });
      previewImage = saved.publicPath;
    }

    let sortOrder = data.sortOrder;
    const sortOrderRaw = String(formData.get("sortOrder") ?? "").trim();
    if (sortOrderRaw === "") {
      const last = await prisma.work.findFirst({
        where: { categoryId },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      sortOrder = (last?.sortOrder ?? -1) + 1;
    }

    const seo = resolveWorkSeo({
      title: data.title,
      summary: data.summary,
      content: data.content,
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
    });

    await prisma.work.create({
      data: {
        title: data.title,
        slug,
        categoryId,
        summary: data.summary || null,
        content: data.content || null,
        image: image || null,
        previewImage: previewImage || null,
        sortOrder,
        isActive: data.isActive,
        seoTitle: seo.seoTitle,
        seoDescription: seo.seoDescription,
        projects: {
          connect: projectIds.map((id) => ({ id })),
        },
      },
    });

    revalidateWorkPublic(slug);
    return { success: true, message: "Çalışma oluşturuldu." };
  } catch (error) {
    if (error instanceof Error && error.message === "CATEGORY_NOT_FOUND") {
      return { error: "Seçilen kategori bulunamadı." };
    }
    if (error instanceof Error && error.message === "PROJECT_NOT_FOUND") {
      return { error: "Seçilen projelerden biri bulunamadı." };
    }
    console.error(error);
    return { error: "Çalışma eklenirken bir hata oluştu." };
  }
}

export async function updateWorkAction(
  _prev: WorkFormState,
  formData: FormData,
): Promise<WorkFormState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Çalışma bulunamadı." };

  const data = parseWorkPayload(formData);
  if (!data.title) {
    return { error: "Başlık zorunludur.", fieldErrors: { title: "Zorunlu alan" } };
  }
  if (data.seoTitle.length > SEO_TITLE_MAX) {
    return {
      error: `SEO başlığı en fazla ${SEO_TITLE_MAX} karakter olabilir.`,
      fieldErrors: { seoTitle: `En fazla ${SEO_TITLE_MAX} karakter` },
    };
  }
  if (data.seoDescription.length > SEO_DESCRIPTION_MAX) {
    return {
      error: `SEO açıklaması en fazla ${SEO_DESCRIPTION_MAX} karakter olabilir.`,
      fieldErrors: { seoDescription: `En fazla ${SEO_DESCRIPTION_MAX} karakter` },
    };
  }

  try {
    const existing = await prisma.work.findUnique({ where: { id } });
    if (!existing) return { error: "Çalışma bulunamadı." };

    const categoryId = await assertValidCategory(data.categoryId);
    const projectIds = await resolveProjectIds(data.projectIds);
    const slug = await uniqueWorkSlug(data.slugInput || data.title, id);
    let image = data.existingImage;
    let previewImage = data.existingPreviewImage;

    if (data.imageFile instanceof File && data.imageFile.size > 0) {
      const saved = await saveOptimizedImage(data.imageFile, {
        uploadDir: "uploads/works",
        maxBytes: uploadLimits.image,
        mode: "webp",
        quality: 82,
        previousPath: existing.image || undefined,
      });
      image = saved.publicPath;
    } else if (!image && existing.image) {
      await deletePublicAsset(existing.image);
      image = "";
    }

    if (data.previewImageFile instanceof File && data.previewImageFile.size > 0) {
      const saved = await saveOptimizedImage(data.previewImageFile, {
        uploadDir: "uploads/works",
        maxBytes: 12 * 1024 * 1024,
        mode: "webp",
        quality: 78,
        width: 1440,
        height: 20000,
        fit: "inside",
        previousPath: existing.previewImage || undefined,
      });
      previewImage = saved.publicPath;
    } else if (!previewImage && existing.previewImage) {
      await deletePublicAsset(existing.previewImage);
      previewImage = "";
    }

    const seo = resolveWorkSeo({
      title: data.title,
      summary: data.summary,
      content: data.content,
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
    });

    await prisma.work.update({
      where: { id },
      data: {
        title: data.title,
        slug,
        categoryId,
        summary: data.summary || null,
        content: data.content || null,
        image: image || null,
        previewImage: previewImage || null,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
        seoTitle: seo.seoTitle,
        seoDescription: seo.seoDescription,
        ...(data.isActive || categoryId ? { statusNote: null } : {}),
        projects: {
          set: projectIds.map((projectId) => ({ id: projectId })),
        },
      },
    });

    revalidatePath(`/admin/works/${id}/edit`);
    revalidateWorkPublic(slug);
    return { success: true, message: "Çalışma güncellendi." };
  } catch (error) {
    if (error instanceof Error && error.message === "CATEGORY_NOT_FOUND") {
      return { error: "Seçilen kategori bulunamadı." };
    }
    if (error instanceof Error && error.message === "PROJECT_NOT_FOUND") {
      return { error: "Seçilen projelerden biri bulunamadı." };
    }
    console.error(error);
    return { error: "Çalışma güncellenirken bir hata oluştu." };
  }
}

export async function deleteWorkAction(formData: FormData): Promise<DeleteWorkResult> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Çalışma bulunamadı." };

  const existing = await prisma.work.findUnique({ where: { id } });
  if (!existing) return { error: "Çalışma bulunamadı." };

  const imagePath = existing.image;
  const previewImagePath = existing.previewImage;
  await prisma.work.delete({ where: { id } });
  if (imagePath) {
    await deletePublicAsset(imagePath);
  }
  if (previewImagePath) {
    await deletePublicAsset(previewImagePath);
  }

  revalidateWorkPublic(existing.slug);
  return { success: true, message: "Çalışma silindi." };
}

export async function toggleWorkActiveAction(formData: FormData) {
  try {
    await requireAdmin();
  } catch {
    return;
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const existing = await prisma.work.findUnique({ where: { id } });
  if (!existing) return;

  await prisma.work.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });

  revalidateWorkPublic(existing.slug);
}
