"use server";

import { revalidatePath } from "next/cache";
import { bustBlogCache } from "@/lib/blog";
import { auth } from "@/auth";
import { collectDescendantIds } from "@/lib/category-tree";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import {
  deletePublicAsset,
  saveOptimizedImage,
  uploadLimits,
} from "@/lib/uploads";
import { BLOG_STATUS_NOTE_NO_CATEGORY } from "@/lib/blog-status";

export type BlogCategoryFormState = {
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

async function uniqueBlogCategorySlug(base: string, excludeId?: string) {
  const slug = slugify(base) || "kategori";
  let candidate = slug;
  let i = 2;

  while (true) {
    const existing = await prisma.blogCategory.findFirst({
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

  const parent = await prisma.blogCategory.findUnique({
    where: { id: parentId },
    select: { id: true },
  });
  if (!parent) {
    throw new Error("PARENT_NOT_FOUND");
  }

  if (selfId) {
    const all = await prisma.blogCategory.findMany({
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

function mapParentError(error: unknown): BlogCategoryFormState | null {
  if (!(error instanceof Error)) return null;
  if (error.message === "PARENT_NOT_FOUND") {
    return { error: "Seçilen üst kategori bulunamadı." };
  }
  if (error.message === "INVALID_PARENT_CYCLE") {
    return { error: "Bir kategori kendi alt kategorisinin altına taşınamaz." };
  }
  return null;
}

export async function createBlogCategoryAction(
  _prev: BlogCategoryFormState,
  formData: FormData,
): Promise<BlogCategoryFormState> {
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
    const slug = await uniqueBlogCategorySlug(data.slugInput || data.name);
    let image = data.existingImage;

    if (data.imageFile instanceof File && data.imageFile.size > 0) {
      const saved = await saveOptimizedImage(data.imageFile, {
        uploadDir: "uploads/blog/categories",
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
      const lastSibling = await prisma.blogCategory.findFirst({
        where: { parentId },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      sortOrder = (lastSibling?.sortOrder ?? -1) + 1;
    }

    await prisma.blogCategory.create({
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

    bustBlogCache();
    revalidatePath("/blog");
    revalidatePath("/blog/kategori");
    revalidatePath("/admin/blog/categories");
    revalidatePath("/admin/blog/posts");
    return { success: true, message: "Kategori oluşturuldu." };
  } catch (error) {
    const mapped = mapParentError(error);
    if (mapped) return mapped;
    console.error(error);
    return { error: "Kategori eklenirken bir hata oluştu." };
  }
}

export async function updateBlogCategoryAction(
  _prev: BlogCategoryFormState,
  formData: FormData,
): Promise<BlogCategoryFormState> {
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
    const existing = await prisma.blogCategory.findUnique({ where: { id } });
    if (!existing) return { error: "Kategori bulunamadı." };

    const parentId = await assertValidParent(data.parentId, id);
    const slug = await uniqueBlogCategorySlug(data.slugInput || data.name, id);
    let image = data.existingImage;

    if (data.imageFile instanceof File && data.imageFile.size > 0) {
      const saved = await saveOptimizedImage(data.imageFile, {
        uploadDir: "uploads/blog/categories",
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

    await prisma.blogCategory.update({
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

    bustBlogCache();
    revalidatePath("/blog");
    revalidatePath("/blog/kategori");
    revalidatePath("/admin/blog/categories");
    revalidatePath(`/admin/blog/categories/${id}/edit`);
    revalidatePath("/admin/blog/posts");
    return { success: true, message: "Kategori güncellendi." };
  } catch (error) {
    const mapped = mapParentError(error);
    if (mapped) return mapped;
    console.error(error);
    return { error: "Kategori güncellenirken bir hata oluştu." };
  }
}

export type CategoryPostItem = {
  id: string;
  title: string;
  slug: string;
  isActive: boolean;
  image: string | null;
};

export type DeleteBlogCategoryResult = {
  success?: boolean;
  blocked?: boolean;
  error?: string;
  message?: string;
};

export type DeactivateBlogCategoryResult = {
  success?: boolean;
  error?: string;
  message?: string;
};

export async function getCategoryPostsAction(
  categoryId: string,
): Promise<{ posts: CategoryPostItem[]; error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { posts: [], error: "Oturum bulunamadı." };
  }

  const id = categoryId.trim();
  if (!id) return { posts: [], error: "Kategori bulunamadı." };

  const posts = await prisma.blogPost.findMany({
    where: { categoryId: id },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: { id: true, title: true, slug: true, isActive: true, image: true },
  });

  return { posts };
}

export async function deleteBlogCategoryAction(input: {
  id: string;
  /** Bağlı yazılar varsa zorunlu */
  postsMode?: "delete" | "deactivate";
}): Promise<DeleteBlogCategoryResult> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const id = String(input.id ?? "").trim();
  if (!id) return { error: "Kategori bulunamadı." };

  const existing = await prisma.blogCategory.findUnique({
    where: { id },
    include: {
      _count: { select: { posts: true, children: true } },
      children: { select: { id: true, name: true }, take: 5, orderBy: { sortOrder: "asc" } },
      posts: { select: { id: true, image: true } },
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

  if (existing._count.posts > 0 && !input.postsMode) {
    return {
      error: "Bu kategoriye bağlı yazılar var. Silme veya pasife alma seçeneğini belirtin.",
    };
  }

  try {
    if (existing._count.posts > 0 && input.postsMode === "delete") {
      for (const post of existing.posts) {
        await prisma.blogPost.delete({ where: { id: post.id } });
        if (post.image) {
          await deletePublicAsset(post.image);
        }
      }
    } else if (existing._count.posts > 0 && input.postsMode === "deactivate") {
      await prisma.blogPost.updateMany({
        where: { categoryId: id },
        data: {
          isActive: false,
          categoryId: null,
          statusNote: BLOG_STATUS_NOTE_NO_CATEGORY,
        },
      });
    }

    const imagePath = existing.image;
    await prisma.blogCategory.delete({ where: { id } });
    if (imagePath) {
      await deletePublicAsset(imagePath);
    }

    bustBlogCache();
    revalidatePath("/blog");
    revalidatePath("/blog/kategori");
    revalidatePath("/admin/blog/categories");
    revalidatePath("/admin/blog/posts");
    return {
      success: true,
      message:
        input.postsMode === "delete"
          ? "Kategori ve bağlı yazılar silindi."
          : input.postsMode === "deactivate"
            ? "Kategori silindi; bağlı yazılar pasife alındı."
            : "Kategori silindi.",
    };
  } catch (error) {
    console.error(error);
    return { error: "Kategori silinirken bir hata oluştu." };
  }
}

export async function deactivateBlogCategoryAction(input: {
  id: string;
  /** postId -> hedef kategoriId (boş = taşınmaz, pasife alınır) */
  moves?: Record<string, string>;
}): Promise<DeactivateBlogCategoryResult> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const id = String(input.id ?? "").trim();
  if (!id) return { error: "Kategori bulunamadı." };

  const existing = await prisma.blogCategory.findUnique({
    where: { id },
    select: { id: true, name: true, isActive: true },
  });
  if (!existing) return { error: "Kategori bulunamadı." };

  if (!existing.isActive) {
    return { error: "Kategori zaten pasif." };
  }

  const moves = input.moves ?? {};

  try {
    for (const [postId, targetCategoryIdRaw] of Object.entries(moves)) {
      const targetCategoryId = targetCategoryIdRaw.trim();
      if (!targetCategoryId || targetCategoryId === id) continue;

      const target = await prisma.blogCategory.findUnique({
        where: { id: targetCategoryId },
        select: { id: true },
      });
      if (!target) {
        return { error: "Taşınacak hedef kategori bulunamadı." };
      }

      const post = await prisma.blogPost.findFirst({
        where: { id: postId, categoryId: id },
        select: { id: true },
      });
      if (!post) continue;

      await prisma.blogPost.update({
        where: { id: postId },
        data: {
          categoryId: targetCategoryId,
          statusNote: null,
        },
      });
    }

    const remaining = await prisma.blogPost.updateMany({
      where: { categoryId: id },
      data: { isActive: false },
    });

    await prisma.blogCategory.update({
      where: { id },
      data: { isActive: false },
    });

    bustBlogCache();
    revalidatePath("/blog");
    revalidatePath("/blog/kategori");
    revalidatePath("/admin/blog/categories");
    revalidatePath("/admin/blog/posts");
    return {
      success: true,
      message:
        remaining.count > 0
          ? `Kategori pasife alındı. ${remaining.count} yazı da pasife alındı.`
          : "Kategori pasife alındı.",
    };
  } catch (error) {
    console.error(error);
    return { error: "Kategori pasife alınırken bir hata oluştu." };
  }
}

export async function activateBlogCategoryAction(categoryId: string): Promise<DeactivateBlogCategoryResult> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const id = categoryId.trim();
  if (!id) return { error: "Kategori bulunamadı." };

  const existing = await prisma.blogCategory.findUnique({ where: { id } });
  if (!existing) return { error: "Kategori bulunamadı." };

  await prisma.blogCategory.update({
    where: { id },
    data: { isActive: true },
  });

  bustBlogCache();
  revalidatePath("/blog");
  revalidatePath("/blog/kategori");
  revalidatePath("/admin/blog/categories");
  revalidatePath("/admin/blog/posts");
  return { success: true, message: "Kategori aktifleştirildi." };
}

/** @deprecated Power butonu artık modal kullanıyor; geriye dönük uyumluluk */
export async function toggleBlogCategoryActiveAction(formData: FormData) {
  try {
    await requireAdmin();
  } catch {
    return;
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const existing = await prisma.blogCategory.findUnique({ where: { id } });
  if (!existing) return;

  if (existing.isActive) {
    await deactivateBlogCategoryAction({ id });
    return;
  }

  await activateBlogCategoryAction(id);
}
