"use server";

import { revalidatePath } from "next/cache";
import { collectDescendantIds } from "@/lib/category-tree";
import { requirePermission } from "@/lib/staff-permissions";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import {
  deletePublicAsset,
  saveOptimizedImage,
  uploadLimits,
} from "@/lib/uploads";

export type ProductCategoryFormState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

function revalidateProductCategoryAdmin(id?: string) {
  revalidatePath("/admin/products/categories");
  if (id) revalidatePath(`/admin/products/categories/${id}/edit`);
}

async function uniqueProductCategorySlug(base: string, excludeId?: string) {
  const slug = slugify(base) || "kategori";
  let candidate = slug;
  let i = 2;

  while (true) {
    const existing = await prisma.productCategory.findFirst({
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

  const parent = await prisma.productCategory.findUnique({
    where: { id: parentId },
    select: { id: true },
  });
  if (!parent) {
    throw new Error("PARENT_NOT_FOUND");
  }

  if (selfId) {
    const all = await prisma.productCategory.findMany({
      select: {
        id: true,
        parentId: true,
        name: true,
        slug: true,
        sortOrder: true,
        isActive: true,
      },
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
    seoTitle,
    seoDescription,
    parentId: parentIdRaw || null,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    isActive,
    existingImage,
    imageFile,
  };
}

function mapParentError(error: unknown): ProductCategoryFormState | null {
  if (!(error instanceof Error)) return null;
  if (error.message === "PARENT_NOT_FOUND") {
    return { error: "Seçilen üst kategori bulunamadı." };
  }
  if (error.message === "INVALID_PARENT_CYCLE") {
    return { error: "Bir kategori kendi alt kategorisinin altına taşınamaz." };
  }
  return null;
}

export async function createProductCategoryAction(
  _prev: ProductCategoryFormState,
  formData: FormData,
): Promise<ProductCategoryFormState> {
  const gate = await requirePermission("product_categories", "create");
  if (!gate.ok) return { error: gate.error };

  const data = parseCategoryPayload(formData);
  if (!data.name) {
    return { error: "Kategori adı zorunludur.", fieldErrors: { name: "Zorunlu alan" } };
  }

  try {
    const parentId = await assertValidParent(data.parentId);
    const slug = await uniqueProductCategorySlug(data.slugInput || data.name);
    let image = data.existingImage;

    if (data.imageFile instanceof File && data.imageFile.size > 0) {
      const saved = await saveOptimizedImage(data.imageFile, {
        uploadDir: "uploads/products/categories",
        maxBytes: uploadLimits.image,
        mode: "webp",
        quality: 82,
      });
      image = saved.publicPath;
    }

    let sortOrder = data.sortOrder;
    const sortOrderRaw = String(formData.get("sortOrder") ?? "").trim();
    if (sortOrderRaw === "") {
      const lastSibling = await prisma.productCategory.findFirst({
        where: { parentId },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      sortOrder = (lastSibling?.sortOrder ?? -1) + 1;
    }

    await prisma.productCategory.create({
      data: {
        name: data.name,
        slug,
        parentId,
        description: data.description || null,
        image: image || null,
        seoTitle: data.seoTitle || null,
        seoDescription: data.seoDescription || null,
        sortOrder,
        isActive: data.isActive,
      },
    });

    revalidateProductCategoryAdmin();
    return { success: true, message: "Kategori oluşturuldu." };
  } catch (error) {
    const mapped = mapParentError(error);
    if (mapped) return mapped;
    console.error(error);
    return { error: "Kategori eklenirken bir hata oluştu." };
  }
}

export async function updateProductCategoryAction(
  _prev: ProductCategoryFormState,
  formData: FormData,
): Promise<ProductCategoryFormState> {
  const gate = await requirePermission("product_categories", "update");
  if (!gate.ok) return { error: gate.error };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Kategori bulunamadı." };

  const data = parseCategoryPayload(formData);
  if (!data.name) {
    return { error: "Kategori adı zorunludur.", fieldErrors: { name: "Zorunlu alan" } };
  }

  try {
    const existing = await prisma.productCategory.findUnique({ where: { id } });
    if (!existing) return { error: "Kategori bulunamadı." };

    const parentId = await assertValidParent(data.parentId, id);
    const slug = await uniqueProductCategorySlug(data.slugInput || data.name, id);
    let image = data.existingImage;

    if (data.imageFile instanceof File && data.imageFile.size > 0) {
      const saved = await saveOptimizedImage(data.imageFile, {
        uploadDir: "uploads/products/categories",
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

    await prisma.productCategory.update({
      where: { id },
      data: {
        name: data.name,
        slug,
        parentId,
        description: data.description || null,
        image: image || null,
        seoTitle: data.seoTitle || null,
        seoDescription: data.seoDescription || null,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
      },
    });

    revalidateProductCategoryAdmin(id);
    return { success: true, message: "Kategori güncellendi." };
  } catch (error) {
    const mapped = mapParentError(error);
    if (mapped) return mapped;
    console.error(error);
    return { error: "Kategori güncellenirken bir hata oluştu." };
  }
}

export type DeleteProductCategoryResult = {
  success?: boolean;
  blocked?: boolean;
  error?: string;
  message?: string;
};

export async function deleteProductCategoryAction(input: {
  id: string;
}): Promise<DeleteProductCategoryResult> {
  const gate = await requirePermission("product_categories", "delete");
  if (!gate.ok) return { error: gate.error };

  const id = String(input.id ?? "").trim();
  if (!id) return { error: "Kategori bulunamadı." };

  const existing = await prisma.productCategory.findUnique({
    where: { id },
    include: {
      _count: { select: { children: true } },
      children: { select: { id: true, name: true }, take: 5, orderBy: { sortOrder: "asc" } },
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

  try {
    const imagePath = existing.image;
    await prisma.productCategory.delete({ where: { id } });
    if (imagePath) {
      await deletePublicAsset(imagePath);
    }

    revalidateProductCategoryAdmin();
    return { success: true, message: "Kategori silindi." };
  } catch (error) {
    console.error(error);
    return { error: "Kategori silinirken bir hata oluştu." };
  }
}

export async function toggleProductCategoryActiveAction(categoryId: string): Promise<{
  success?: boolean;
  error?: string;
  message?: string;
}> {
  const gate = await requirePermission("product_categories", "update");
  if (!gate.ok) return { error: gate.error };

  const id = categoryId.trim();
  if (!id) return { error: "Kategori bulunamadı." };

  const existing = await prisma.productCategory.findUnique({
    where: { id },
    select: { id: true, isActive: true },
  });
  if (!existing) return { error: "Kategori bulunamadı." };

  await prisma.productCategory.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });

  revalidateProductCategoryAdmin(id);
  return {
    success: true,
    message: existing.isActive ? "Kategori pasife alındı." : "Kategori aktifleştirildi.",
  };
}
