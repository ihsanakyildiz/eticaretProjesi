"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { bustBlogCache } from "@/lib/blog";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveBlogSeo, SEO_DESCRIPTION_MAX, SEO_TITLE_MAX } from "@/lib/seo";
import { slugify } from "@/lib/slug";
import {
  deletePublicAsset,
  saveOptimizedImage,
  uploadLimits,
} from "@/lib/uploads";

export type BlogPostFormState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export type DeleteBlogPostResult = {
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

async function uniqueBlogPostSlug(base: string, excludeId?: string) {
  const slug = slugify(base) || "yazi";
  let candidate = slug;
  let i = 2;

  while (true) {
    const existing = await prisma.blogPost.findFirst({
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

function revalidateBlogPublic(slug?: string | null) {
  bustBlogCache();
  revalidateTag("pages");
  revalidatePath("/admin/blog/posts");
  revalidatePath("/admin/blog/categories");
  revalidatePath("/blog");
  revalidatePath("/blog/kategori");
  revalidatePath("/");
  if (slug) revalidatePath(`/blog/${slug}`);
}

async function assertValidCategory(categoryId: string | null) {
  if (!categoryId) return null;

  const category = await prisma.blogCategory.findUnique({
    where: { id: categoryId },
    select: { id: true },
  });
  if (!category) {
    throw new Error("CATEGORY_NOT_FOUND");
  }

  return categoryId;
}

function parseBlogPostPayload(formData: FormData) {
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
  };
}

export async function createBlogPostAction(
  _prev: BlogPostFormState,
  formData: FormData,
): Promise<BlogPostFormState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const data = parseBlogPostPayload(formData);
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
    const slug = await uniqueBlogPostSlug(data.slugInput || data.title);
    let image = data.existingImage;

    if (data.imageFile instanceof File && data.imageFile.size > 0) {
      const saved = await saveOptimizedImage(data.imageFile, {
        uploadDir: "uploads/blog/posts",
        maxBytes: uploadLimits.image,
        mode: "webp",
        quality: 82,
      });
      image = saved.publicPath;
    }

    let sortOrder = data.sortOrder;
    const sortOrderRaw = String(formData.get("sortOrder") ?? "").trim();
    if (sortOrderRaw === "") {
      const last = await prisma.blogPost.findFirst({
        where: { categoryId },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      sortOrder = (last?.sortOrder ?? -1) + 1;
    }

    const seo = resolveBlogSeo({
      title: data.title,
      summary: data.summary,
      content: data.content,
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
    });

    await prisma.blogPost.create({
      data: {
        title: data.title,
        slug,
        categoryId,
        summary: data.summary || null,
        content: data.content || null,
        image: image || null,
        sortOrder,
        isActive: data.isActive,
        seoTitle: seo.seoTitle,
        seoDescription: seo.seoDescription,
      },
    });

    revalidateBlogPublic(slug);
    return { success: true, message: "Yazı oluşturuldu." };
  } catch (error) {
    if (error instanceof Error && error.message === "CATEGORY_NOT_FOUND") {
      return { error: "Seçilen kategori bulunamadı." };
    }
    console.error(error);
    return { error: "Yazı eklenirken bir hata oluştu." };
  }
}

export async function updateBlogPostAction(
  _prev: BlogPostFormState,
  formData: FormData,
): Promise<BlogPostFormState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Yazı bulunamadı." };

  const data = parseBlogPostPayload(formData);
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
    const existing = await prisma.blogPost.findUnique({ where: { id } });
    if (!existing) return { error: "Yazı bulunamadı." };

    const categoryId = await assertValidCategory(data.categoryId);
    const slug = await uniqueBlogPostSlug(data.slugInput || data.title, id);
    let image = data.existingImage;

    if (data.imageFile instanceof File && data.imageFile.size > 0) {
      const saved = await saveOptimizedImage(data.imageFile, {
        uploadDir: "uploads/blog/posts",
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

    const seo = resolveBlogSeo({
      title: data.title,
      summary: data.summary,
      content: data.content,
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
    });

    await prisma.blogPost.update({
      where: { id },
      data: {
        title: data.title,
        slug,
        categoryId,
        summary: data.summary || null,
        content: data.content || null,
        image: image || null,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
        seoTitle: seo.seoTitle,
        seoDescription: seo.seoDescription,
        ...(data.isActive || categoryId ? { statusNote: null } : {}),
      },
    });

    revalidatePath(`/admin/blog/posts/${id}/edit`);
    revalidateBlogPublic(slug);
    return { success: true, message: "Yazı güncellendi." };
  } catch (error) {
    if (error instanceof Error && error.message === "CATEGORY_NOT_FOUND") {
      return { error: "Seçilen kategori bulunamadı." };
    }
    console.error(error);
    return { error: "Yazı güncellenirken bir hata oluştu." };
  }
}

export async function deleteBlogPostAction(formData: FormData): Promise<DeleteBlogPostResult> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Yazı bulunamadı." };

  const existing = await prisma.blogPost.findUnique({ where: { id } });
  if (!existing) return { error: "Yazı bulunamadı." };

  const imagePath = existing.image;
  await prisma.blogPost.delete({ where: { id } });
  if (imagePath) {
    await deletePublicAsset(imagePath);
  }

  revalidateBlogPublic(existing.slug);
  return { success: true, message: "Yazı silindi." };
}

export async function toggleBlogPostActiveAction(formData: FormData) {
  try {
    await requireAdmin();
  } catch {
    return;
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const existing = await prisma.blogPost.findUnique({ where: { id } });
  if (!existing) return;

  await prisma.blogPost.update({
    where: { id },
    data: {
      isActive: !existing.isActive,
      ...(!existing.isActive ? { statusNote: null } : {}),
    },
  });

  revalidateBlogPublic(existing.slug);
}
