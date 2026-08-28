"use server";

import { revalidatePath } from "next/cache";
import { bustWorkCache } from "@/lib/works";
import { auth } from "@/auth";
import { collectDescendantIds } from "@/lib/category-tree";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import {
  deletePublicAsset,
  saveOptimizedImage,
  uploadLimits,
} from "@/lib/uploads";
import { WORK_STATUS_NOTE_NO_CATEGORY } from "@/lib/work-status";

export type WorkCategoryFormState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

function revalidateWorkCategoryPublic(slug?: string | null) {
  revalidatePath("/yapilan-isler");
  revalidatePath("/yapilan-isler/kategori");
  if (slug) revalidatePath(`/yapilan-isler/kategori/${slug}`);
}

async function uniqueWorkCategorySlug(base: string, excludeId?: string) {
  const slug = slugify(base) || "kategori";
  let candidate = slug;
  let i = 2;

  while (true) {
    const existing = await prisma.workCategory.findFirst({
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

async function assertValidParent(parentId: string | null, selfId?: string) {
  if (!parentId) return null;

  const parent = await prisma.workCategory.findUnique({
    where: { id: parentId },
    select: { id: true },
  });
  if (!parent) {
    throw new Error("PARENT_NOT_FOUND");
  }

  if (selfId) {
    const all = await prisma.workCategory.findMany({
      select: { id: true, parentId: true, name: true, slug: true, sortOrder: true, isActive: true },
    });
    const blocked = collectDescendantIds(all, selfId);
    if (blocked.has(parentId)) {
      throw new Error("INVALID_PARENT_CYCLE");
    }
  }

  return parentId;
}

function parseCategoryPayload(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const icon = String(formData.get("icon") ?? "").trim();
  const seoTitle = String(formData.get("seoTitle") ?? "").trim();
  const seoDescription = String(formData.get("seoDescription") ?? "").trim();
  const parentIdRaw = String(formData.get("parentId") ?? "").trim();
  const sortOrder = Number.parseInt(String(formData.get("sortOrder") ?? "0"), 10);
  const isActive = formData.get("isActive") === "on" || formData.get("isActive") === "true";
  const existingImage = String(formData.get("image") ?? "").trim();
  const imageFile = formData.get("image_file");

  return {
    name,
    slugInput,
    description,
    content,
    icon,
    seoTitle,
    seoDescription,
    parentId: parentIdRaw || null,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    isActive,
    existingImage,
    imageFile,
  };
}

function mapParentError(error: unknown): WorkCategoryFormState | null {
  if (!(error instanceof Error)) return null;
  if (error.message === "PARENT_NOT_FOUND") {
    return { error: "Seçilen üst kategori bulunamadı." };
  }
  if (error.message === "INVALID_PARENT_CYCLE") {
    return { error: "Bir kategori kendi alt kategorisinin altına taşınamaz." };
  }
  return null;
}

export async function createWorkCategoryAction(
  _prev: WorkCategoryFormState,
  formData: FormData,
): Promise<WorkCategoryFormState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const data = parseCategoryPayload(formData);
  if (!data.name) {
    return { error: "Kategori adı zorunludur.", fieldErrors: { name: "Zorunlu alan" } };
  }

  try {
    const parentId = await assertValidParent(data.parentId);
    const slug = await uniqueWorkCategorySlug(data.slugInput || data.name);
    let image = data.existingImage;

    if (data.imageFile instanceof File && data.imageFile.size > 0) {
      const saved = await saveOptimizedImage(data.imageFile, {
        uploadDir: "uploads/works/categories",
        maxBytes: uploadLimits.image,
        mode: "webp",
        quality: 82,
      });
      image = saved.publicPath;
    }

    // Aynı seviyedeki son sıranın arkasına eklemek için
    let sortOrder = data.sortOrder;
    const sortOrderRaw = String(formData.get("sortOrder") ?? "").trim();
    if (sortOrderRaw === "") {
      const lastSibling = await prisma.workCategory.findFirst({
        where: { parentId },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      sortOrder = (lastSibling?.sortOrder ?? -1) + 1;
    }

    await prisma.workCategory.create({
      data: {
        name: data.name,
        slug,
        parentId,
        description: data.description || null,
        content: data.content || null,
        icon: data.icon || null,
        image: image || null,
        seoTitle: data.seoTitle || null,
        seoDescription: data.seoDescription || null,
        sortOrder,
        isActive: data.isActive,
      },
    });

    bustWorkCache();
    revalidateWorkCategoryPublic(slug);
    revalidatePath("/admin/works/categories");
    revalidatePath("/admin/works");
    return { success: true, message: "Kategori oluşturuldu." };
  } catch (error) {
    const mapped = mapParentError(error);
    if (mapped) return mapped;
    console.error(error);
    return { error: "Kategori eklenirken bir hata oluştu." };
  }
}

export async function updateWorkCategoryAction(
  _prev: WorkCategoryFormState,
  formData: FormData,
): Promise<WorkCategoryFormState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Kategori bulunamadı." };

  const data = parseCategoryPayload(formData);
  if (!data.name) {
    return { error: "Kategori adı zorunludur.", fieldErrors: { name: "Zorunlu alan" } };
  }

  try {
    const existing = await prisma.workCategory.findUnique({ where: { id } });
    if (!existing) return { error: "Kategori bulunamadı." };

    const parentId = await assertValidParent(data.parentId, id);
    const slug = await uniqueWorkCategorySlug(data.slugInput || data.name, id);
    let image = data.existingImage;

    if (data.imageFile instanceof File && data.imageFile.size > 0) {
      const saved = await saveOptimizedImage(data.imageFile, {
        uploadDir: "uploads/works/categories",
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

    await prisma.workCategory.update({
      where: { id },
      data: {
        name: data.name,
        slug,
        parentId,
        description: data.description || null,
        content: data.content || null,
        icon: data.icon || null,
        image: image || null,
        seoTitle: data.seoTitle || null,
        seoDescription: data.seoDescription || null,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
      },
    });

    bustWorkCache();
    revalidateWorkCategoryPublic(slug);
    revalidatePath("/admin/works/categories");
    revalidatePath(`/admin/works/categories/${id}/edit`);
    revalidatePath("/admin/works");
    return { success: true, message: "Kategori güncellendi." };
  } catch (error) {
    const mapped = mapParentError(error);
    if (mapped) return mapped;
    console.error(error);
    return { error: "Kategori güncellenirken bir hata oluştu." };
  }
}

export type CategoryWorkItem = {
  id: string;
  title: string;
  slug: string;
  isActive: boolean;
  image: string | null;
};

export type DeleteWorkCategoryResult = {
  success?: boolean;
  blocked?: boolean;
  error?: string;
  message?: string;
};

export type DeactivateWorkCategoryResult = {
  success?: boolean;
  error?: string;
  message?: string;
};

export async function getCategoryWorksAction(
  categoryId: string,
): Promise<{ works: CategoryWorkItem[]; error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { works: [], error: "Oturum bulunamadı." };
  }

  const id = categoryId.trim();
  if (!id) return { works: [], error: "Kategori bulunamadı." };

  const works = await prisma.work.findMany({
    where: { categoryId: id },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: { id: true, title: true, slug: true, isActive: true, image: true },
  });

  return { works };
}

export async function deleteWorkCategoryAction(input: {
  id: string;
  /** Bağlı çalışmalar varsa zorunlu */
  worksMode?: "delete" | "deactivate";
}): Promise<DeleteWorkCategoryResult> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const id = String(input.id ?? "").trim();
  if (!id) return { error: "Kategori bulunamadı." };

  const existing = await prisma.workCategory.findUnique({
    where: { id },
    include: {
      _count: { select: { works: true, children: true } },
      children: { select: { id: true, name: true }, take: 5, orderBy: { sortOrder: "asc" } },
      works: { select: { id: true, image: true } },
    },
  });
  if (!existing) return { error: "Kategori bulunamadı." };

  if (existing._count.children > 0) {
    const childNames = existing.children.map((child) => child.name).join(", ");
    const more =
      existing._count.children > existing.children.length
        ? ` ve ${existing._count.children - existing.children.length} diğer`
        : "";

    return {
      blocked: true,
      error: `"${existing.name}" kategorisinin ${existing._count.children} alt kategorisi var (${childNames}${more}). Silmeden önce alt kategorileri başka bir üst kategoriye taşıyın veya silin.`,
    };
  }

  if (existing._count.works > 0 && !input.worksMode) {
    return {
      error: "Bu kategoriye bağlı çalışmalar var. Silme veya pasife alma seçeneğini belirtin.",
    };
  }

  try {
    if (existing._count.works > 0 && input.worksMode === "delete") {
      for (const work of existing.works) {
        await prisma.work.delete({ where: { id: work.id } });
        if (work.image) {
          await deletePublicAsset(work.image);
        }
      }
    } else if (existing._count.works > 0 && input.worksMode === "deactivate") {
      await prisma.work.updateMany({
        where: { categoryId: id },
        data: {
          isActive: false,
          categoryId: null,
          statusNote: WORK_STATUS_NOTE_NO_CATEGORY,
        },
      });
    }

    const imagePath = existing.image;
    await prisma.workCategory.delete({ where: { id } });
    if (imagePath) {
      await deletePublicAsset(imagePath);
    }

    bustWorkCache();
    revalidateWorkCategoryPublic(existing.slug);
    revalidatePath("/admin/works/categories");
    revalidatePath("/admin/works");
    return {
      success: true,
      message:
        input.worksMode === "delete"
          ? "Kategori ve bağlı çalışmalar silindi."
          : input.worksMode === "deactivate"
            ? "Kategori silindi; bağlı çalışmalar pasife alındı."
            : "Kategori silindi.",
    };
  } catch (error) {
    console.error(error);
    return { error: "Kategori silinirken bir hata oluştu." };
  }
}

export async function deactivateWorkCategoryAction(input: {
  id: string;
  /** workId -> hedef kategoriId (boş = taşınmaz, pasife alınır) */
  moves?: Record<string, string>;
}): Promise<DeactivateWorkCategoryResult> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const id = String(input.id ?? "").trim();
  if (!id) return { error: "Kategori bulunamadı." };

  const existing = await prisma.workCategory.findUnique({
    where: { id },
    select: { id: true, name: true, slug: true, isActive: true },
  });
  if (!existing) return { error: "Kategori bulunamadı." };

  if (!existing.isActive) {
    return { error: "Kategori zaten pasif." };
  }

  const moves = input.moves ?? {};

  try {
    for (const [workId, targetCategoryIdRaw] of Object.entries(moves)) {
      const targetCategoryId = targetCategoryIdRaw.trim();
      if (!targetCategoryId || targetCategoryId === id) continue;

      const target = await prisma.workCategory.findUnique({
        where: { id: targetCategoryId },
        select: { id: true },
      });
      if (!target) {
        return { error: "Taşınacak hedef kategori bulunamadı." };
      }

      const work = await prisma.work.findFirst({
        where: { id: workId, categoryId: id },
        select: { id: true },
      });
      if (!work) continue;

      await prisma.work.update({
        where: { id: workId },
        data: {
          categoryId: targetCategoryId,
          statusNote: null,
        },
      });
    }

    const remaining = await prisma.work.updateMany({
      where: { categoryId: id },
      data: { isActive: false },
    });

    await prisma.workCategory.update({
      where: { id },
      data: { isActive: false },
    });

    bustWorkCache();
    revalidateWorkCategoryPublic(existing.slug);
    revalidatePath("/admin/works/categories");
    revalidatePath("/admin/works");
    return {
      success: true,
      message:
        remaining.count > 0
          ? `Kategori pasife alındı. ${remaining.count} çalışma da pasife alındı.`
          : "Kategori pasife alındı.",
    };
  } catch (error) {
    console.error(error);
    return { error: "Kategori pasife alınırken bir hata oluştu." };
  }
}

export async function activateWorkCategoryAction(categoryId: string): Promise<DeactivateWorkCategoryResult> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const id = categoryId.trim();
  if (!id) return { error: "Kategori bulunamadı." };

  const existing = await prisma.workCategory.findUnique({ where: { id } });
  if (!existing) return { error: "Kategori bulunamadı." };

  await prisma.workCategory.update({
    where: { id },
    data: { isActive: true },
  });

  bustWorkCache();
  revalidateWorkCategoryPublic(existing.slug);
  revalidatePath("/admin/works/categories");
  revalidatePath("/admin/works");
  return { success: true, message: "Kategori aktifleştirildi." };
}

/** @deprecated Power butonu artık modal kullanıyor; geriye dönük uyumluluk */
export async function toggleWorkCategoryActiveAction(formData: FormData) {
  try {
    await requireAdmin();
  } catch {
    return;
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const existing = await prisma.workCategory.findUnique({ where: { id } });
  if (!existing) return;

  if (existing.isActive) {
    await deactivateWorkCategoryAction({ id });
    return;
  }

  await activateWorkCategoryAction(id);
}
