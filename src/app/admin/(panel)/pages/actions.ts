"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  getDefaultContactFormConfig,
  parseContactFormFieldsJson,
} from "@/config/contact-form";
import { getDefaultContactInfoBlockConfig } from "@/config/contact-info-block";
import {
  applyGridPreset,
  getDefaultGridRowConfig,
  parseGridRowConfig,
} from "@/config/page-grid";
import {
  defaultLimitForType,
  getPageSectionTypeMeta,
  isNestablePageSectionType,
  isPageSectionType,
  parseSectionSettings,
  sectionSupportsEyebrow,
  stringifySectionSettings,
  type PageSectionTypeValue,
} from "@/lib/page-sections";
import { resolvePageSeo, SEO_DESCRIPTION_MAX, SEO_TITLE_MAX } from "@/lib/seo";
import { slugify } from "@/lib/slug";
import {
  collectEditorUploadPathsFromHtmlList,
  diffRemovedEditorUploadPaths,
  purgeUnreferencedEditorUploads,
} from "@/lib/rich-text-uploads";
import {
  deletePublicAsset,
  saveOptimizedImage,
  uploadLimits,
} from "@/lib/uploads";

export type PageFormState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export type DeletePageResult = {
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

async function uniquePageSlug(base: string, excludeId?: string) {
  const slug = slugify(base) || "sayfa";
  let candidate = slug;
  let i = 2;

  while (true) {
    const existing = await prisma.page.findFirst({
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

async function resolveRelatedIds(
  model: "work" | "project" | "blogPost",
  rawIds: string[],
) {
  const unique = [...new Set(rawIds.map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0) return [] as string[];

  switch (model) {
    case "work": {
      const found = await prisma.work.findMany({
        where: { id: { in: unique } },
        select: { id: true },
      });
      if (found.length !== unique.length) throw new Error("WORK_NOT_FOUND");
      return found.map((item) => item.id);
    }
    case "project": {
      const found = await prisma.project.findMany({
        where: { id: { in: unique } },
        select: { id: true },
      });
      if (found.length !== unique.length) throw new Error("PROJECT_NOT_FOUND");
      return found.map((item) => item.id);
    }
    case "blogPost": {
      const found = await prisma.blogPost.findMany({
        where: { id: { in: unique } },
        select: { id: true },
      });
      if (found.length !== unique.length) throw new Error("POST_NOT_FOUND");
      return found.map((item) => item.id);
    }
    default: {
      const _exhaustive: never = model;
      return _exhaustive;
    }
  }
}

function parsePagePayload(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const seoTitle = String(formData.get("seoTitle") ?? "").trim();
  const seoDescription = String(formData.get("seoDescription") ?? "").trim();
  const sortOrder = Number.parseInt(String(formData.get("sortOrder") ?? "0"), 10);
  const isActive = formData.get("isActive") === "on" || formData.get("isActive") === "true";
  const sidebarEnabled =
    formData.get("sidebarEnabled") === "on" ||
    formData.get("sidebarEnabled") === "true";
  const existingImage = String(formData.get("image") ?? "").trim();
  const imageFile = formData.get("image_file");
  const workIds = formData
    .getAll("workIds")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const projectIds = formData
    .getAll("projectIds")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const postIds = formData
    .getAll("postIds")
    .map((value) => String(value).trim())
    .filter(Boolean);

  return {
    title,
    slugInput,
    summary,
    content,
    seoTitle,
    seoDescription,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    isActive,
    sidebarEnabled,
    existingImage,
    imageFile,
    workIds,
    projectIds,
    postIds,
  };
}

function mapRelationError(error: unknown): PageFormState | null {
  if (!(error instanceof Error)) return null;
  if (error.message === "WORK_NOT_FOUND") {
    return { error: "Seçilen çalışmalardan biri bulunamadı." };
  }
  if (error.message === "PROJECT_NOT_FOUND") {
    return { error: "Seçilen projelerden biri bulunamadı." };
  }
  if (error.message === "POST_NOT_FOUND") {
    return { error: "Seçilen yazılardan biri bulunamadı." };
  }
  return null;
}

export async function createClassicPageAction(
  _prev: PageFormState,
  formData: FormData,
): Promise<PageFormState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const data = parsePagePayload(formData);
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
    const [workIds, projectIds, postIds] = await Promise.all([
      resolveRelatedIds("work", data.workIds),
      resolveRelatedIds("project", data.projectIds),
      resolveRelatedIds("blogPost", data.postIds),
    ]);
    const slug = await uniquePageSlug(data.slugInput || data.title);
    let image = data.existingImage;

    if (data.imageFile instanceof File && data.imageFile.size > 0) {
      const saved = await saveOptimizedImage(data.imageFile, {
        uploadDir: "uploads/pages",
        maxBytes: uploadLimits.image,
        mode: "webp",
        quality: 82,
      });
      image = saved.publicPath;
    }

    let sortOrder = data.sortOrder;
    const sortOrderRaw = String(formData.get("sortOrder") ?? "").trim();
    if (sortOrderRaw === "") {
      const last = await prisma.page.findFirst({
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      sortOrder = (last?.sortOrder ?? -1) + 1;
    }

    const seo = resolvePageSeo({
      title: data.title,
      summary: data.summary,
      content: data.content,
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
    });

    await prisma.page.create({
      data: {
        type: "CLASSIC",
        title: data.title,
        slug,
        summary: data.summary || null,
        content: data.content || null,
        image: image || null,
        sortOrder,
        isActive: data.isActive,
        sidebarEnabled: data.sidebarEnabled,
        seoTitle: seo.seoTitle,
        seoDescription: seo.seoDescription,
        works: { connect: workIds.map((id) => ({ id })) },
        projects: { connect: projectIds.map((id) => ({ id })) },
        posts: { connect: postIds.map((id) => ({ id })) },
      },
    });

    revalidatePath("/admin/pages");
    return { success: true, message: "Sayfa oluşturuldu." };
  } catch (error) {
    const mapped = mapRelationError(error);
    if (mapped) return mapped;
    console.error(error);
    return { error: "Sayfa eklenirken bir hata oluştu." };
  }
}

export async function updateClassicPageAction(
  _prev: PageFormState,
  formData: FormData,
): Promise<PageFormState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Sayfa bulunamadı." };

  const data = parsePagePayload(formData);
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
    const existing = await prisma.page.findUnique({ where: { id } });
    if (!existing) return { error: "Sayfa bulunamadı." };
    if (existing.type !== "CLASSIC") {
      return { error: "Bu sayfa gelişmiş tipte; klasik form ile düzenlenemez." };
    }

    const [workIds, projectIds, postIds] = await Promise.all([
      resolveRelatedIds("work", data.workIds),
      resolveRelatedIds("project", data.projectIds),
      resolveRelatedIds("blogPost", data.postIds),
    ]);
    const slug = await uniquePageSlug(data.slugInput || data.title, id);
    let image = data.existingImage;

    if (data.imageFile instanceof File && data.imageFile.size > 0) {
      const saved = await saveOptimizedImage(data.imageFile, {
        uploadDir: "uploads/pages",
        maxBytes: uploadLimits.image,
        mode: "webp",
        quality: 82,
        previousPath: existing.image || undefined,
      });
      image = saved.publicPath;
    } else if (!image && existing.image) {
      await deletePublicAsset(existing.image);
      image = "";
    } else if (image && existing.image && image !== existing.image) {
      await deletePublicAsset(existing.image);
    }

    const seo = resolvePageSeo({
      title: data.title,
      summary: data.summary,
      content: data.content,
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
    });

    await prisma.page.update({
      where: { id },
      data: {
        title: data.title,
        slug,
        summary: data.summary || null,
        content: data.content || null,
        image: image || null,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
        sidebarEnabled: data.sidebarEnabled,
        seoTitle: seo.seoTitle,
        seoDescription: seo.seoDescription,
        works: { set: workIds.map((workId) => ({ id: workId })) },
        projects: { set: projectIds.map((projectId) => ({ id: projectId })) },
        posts: { set: postIds.map((postId) => ({ id: postId })) },
      },
    });

    const removedEditorPaths = [
      ...diffRemovedEditorUploadPaths(existing.summary, data.summary || null),
      ...diffRemovedEditorUploadPaths(existing.content, data.content || null),
    ];
    if (removedEditorPaths.length > 0) {
      await purgeUnreferencedEditorUploads(removedEditorPaths);
    }

    revalidatePath("/admin/pages");
    revalidatePath(`/admin/pages/${id}/edit`);
    return { success: true, message: "Sayfa güncellendi." };
  } catch (error) {
    const mapped = mapRelationError(error);
    if (mapped) return mapped;
    console.error(error);
    return { error: "Sayfa güncellenirken bir hata oluştu." };
  }
}

export async function deletePageAction(formData: FormData): Promise<DeletePageResult> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Sayfa bulunamadı." };

  const existing = await prisma.page.findUnique({ where: { id } });
  if (!existing) return { error: "Sayfa bulunamadı." };

  const imagePath = existing.image;

  const pageSections = await prisma.pageSection.findMany({
    where: { pageId: id },
    select: { content: true },
  });
  const editorPaths = collectEditorUploadPathsFromHtmlList([
    ...pageSections.map((row) => row.content),
    existing.content,
    existing.summary,
  ]);

  await prisma.page.delete({ where: { id } });
  if (imagePath) {
    await deletePublicAsset(imagePath);
  }
  await purgeUnreferencedEditorUploads(editorPaths);

  revalidatePath("/admin/pages");
  return { success: true, message: "Sayfa silindi." };
}

export async function togglePageActiveAction(formData: FormData) {
  try {
    await requireAdmin();
  } catch {
    return;
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const existing = await prisma.page.findUnique({ where: { id } });
  if (!existing) return;

  await prisma.page.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });

  revalidatePath("/admin/pages");
}

function revalidatePublicPage(slug: string) {
  revalidateTag("pages");
  revalidateTag("site");
  revalidatePath(`/${slug}`);
  if (slug === "anasayfa") {
    revalidatePath("/");
  }
}

function parseMetaPayload(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const seoTitle = String(formData.get("seoTitle") ?? "").trim();
  const seoDescription = String(formData.get("seoDescription") ?? "").trim();
  const sortOrder = Number.parseInt(String(formData.get("sortOrder") ?? "0"), 10);
  const isActive =
    formData.get("isActive") === "on" || formData.get("isActive") === "true";
  const sidebarEnabled =
    formData.get("sidebarEnabled") === "on" ||
    formData.get("sidebarEnabled") === "true";

  return {
    title,
    slugInput,
    seoTitle,
    seoDescription,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    isActive,
    sidebarEnabled,
  };
}

export async function createAdvancedPageAction(
  _prev: PageFormState,
  formData: FormData,
): Promise<PageFormState & { pageId?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const data = parseMetaPayload(formData);
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
    const slug = await uniquePageSlug(data.slugInput || data.title);
    let sortOrder = data.sortOrder;
    const sortOrderRaw = String(formData.get("sortOrder") ?? "").trim();
    if (sortOrderRaw === "") {
      const last = await prisma.page.findFirst({
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      sortOrder = (last?.sortOrder ?? -1) + 1;
    }

    const seo = resolvePageSeo({
      title: data.title,
      summary: "",
      content: "",
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
    });

    const page = await prisma.page.create({
      data: {
        type: "ADVANCED",
        title: data.title,
        slug,
        sortOrder,
        isActive: data.isActive,
        sidebarEnabled: data.sidebarEnabled,
        seoTitle: seo.seoTitle,
        seoDescription: seo.seoDescription,
      },
    });

    revalidatePath("/admin/pages");
    return {
      success: true,
      message: "Gelişmiş sayfa oluşturuldu.",
      pageId: page.id,
    };
  } catch (error) {
    console.error(error);
    return { error: "Sayfa eklenirken bir hata oluştu." };
  }
}

export async function updateAdvancedPageMetaAction(
  _prev: PageFormState,
  formData: FormData,
): Promise<PageFormState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Sayfa bulunamadı." };

  const data = parseMetaPayload(formData);
  if (!data.title) {
    return { error: "Başlık zorunludur.", fieldErrors: { title: "Zorunlu alan" } };
  }

  try {
    const existing = await prisma.page.findUnique({ where: { id } });
    if (!existing) return { error: "Sayfa bulunamadı." };
    if (existing.type !== "ADVANCED") {
      return { error: "Bu sayfa gelişmiş tipte değil." };
    }

    const slug = await uniquePageSlug(data.slugInput || data.title, id);
    const seo = resolvePageSeo({
      title: data.title,
      summary: "",
      content: "",
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
    });

    await prisma.page.update({
      where: { id },
      data: {
        title: data.title,
        slug,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
        sidebarEnabled: data.sidebarEnabled,
        seoTitle: seo.seoTitle,
        seoDescription: seo.seoDescription,
      },
    });

    revalidatePath("/admin/pages");
    revalidatePath(`/admin/pages/${id}/edit`);
    revalidatePublicPage(slug);
    if (existing.slug !== slug) revalidatePublicPage(existing.slug);
    return { success: true, message: "Sayfa bilgileri güncellendi." };
  } catch (error) {
    console.error(error);
    return { error: "Sayfa güncellenirken bir hata oluştu." };
  }
}

export type SectionFormState = {
  success?: boolean;
  error?: string;
  message?: string;
};

async function requireAdvancedPage(pageId: string) {
  const page = await prisma.page.findUnique({ where: { id: pageId } });
  if (!page) throw new Error("PAGE_NOT_FOUND");
  if (page.type !== "ADVANCED") throw new Error("NOT_ADVANCED");
  return page;
}

export async function addPageSectionAction(
  pageId: string,
  typeRaw: string,
  options?: { parentId?: string; columnId?: string },
): Promise<SectionFormState> {
  try {
    await requireAdmin();
    const page = await requireAdvancedPage(pageId);
    if (!isPageSectionType(typeRaw)) {
      return { error: "Geçersiz bölüm tipi." };
    }
    const type = typeRaw as PageSectionTypeValue;
    const parentId = options?.parentId?.trim() || null;
    const columnId = options?.columnId?.trim() || null;

    if (parentId) {
      if (!isNestablePageSectionType(type)) {
        return { error: "Bu bölüm tipi grid içine eklenemez." };
      }
      const parent = await prisma.pageSection.findFirst({
        where: { id: parentId, pageId, type: "GRID_ROW" },
        select: { id: true },
      });
      if (!parent) return { error: "Grid satırı bulunamadı." };
      if (!columnId) return { error: "Kolon seçilmedi." };
    }

    const meta = getPageSectionTypeMeta(type);
    const last = await prisma.pageSection.findFirst({
      where: { pageId, parentId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    await prisma.pageSection.create({
      data: {
        pageId,
        parentId,
        type,
        label: meta.defaultLabel,
        sortOrder: (last?.sortOrder ?? -1) + 1,
        settings: stringifySectionSettings({
          limit: defaultLimitForType(type),
          showFeatures: type === "PROJECTS",
          ...(type === "CONTACT_FORM"
            ? { contactForm: getDefaultContactFormConfig() }
            : {}),
          ...(type === "CONTACT_INFO"
            ? { contactInfoBlock: getDefaultContactInfoBlockConfig() }
            : {}),
          ...(type === "GRID_ROW" ? { gridRow: getDefaultGridRowConfig() } : {}),
          ...(parentId && columnId ? { gridCol: { columnId } } : {}),
        }),
      },
    });

    revalidatePath(`/admin/pages/${pageId}/edit`);
    revalidatePublicPage(page.slug);
    return { success: true, message: "Bölüm eklendi." };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return { error: "Oturum bulunamadı." };
      if (error.message === "PAGE_NOT_FOUND") return { error: "Sayfa bulunamadı." };
      if (error.message === "NOT_ADVANCED") return { error: "Bu sayfa gelişmiş değil." };
    }
    console.error(error);
    return { error: "Bölüm eklenirken hata oluştu." };
  }
}

export async function deletePageSectionAction(
  sectionId: string,
): Promise<SectionFormState> {
  try {
    await requireAdmin();
    const section = await prisma.pageSection.findUnique({
      where: { id: sectionId },
      include: {
        page: { select: { id: true, slug: true, type: true } },
        _count: { select: { children: true } },
      },
    });
    if (!section || section.page.type !== "ADVANCED") {
      return { error: "Bölüm bulunamadı." };
    }

    // Grid (ve varsa diğer konteynerler): çocukları + junction kayıtlarını
    // açıkça sil — DB cascade’e ek güvenlik (kalıntı / şişme önlemi).
    const descendantIds = await collectDescendantSectionIds(sectionId);
    const allIds = [sectionId, ...descendantIds];

    const sectionsWithContent = await prisma.pageSection.findMany({
      where: { id: { in: allIds } },
      select: { content: true },
    });
    const editorPaths = collectEditorUploadPathsFromHtmlList(
      sectionsWithContent.map((row) => row.content),
    );

    await prisma.$transaction(async (tx) => {
      await tx.pageSectionCard.deleteMany({ where: { sectionId: { in: allIds } } });
      await tx.pageSectionProject.deleteMany({
        where: { sectionId: { in: allIds } },
      });
      await tx.pageSectionPost.deleteMany({ where: { sectionId: { in: allIds } } });
      await tx.pageSectionWork.deleteMany({ where: { sectionId: { in: allIds } } });

      // Önce en derin çocuklar, sonra üst — orphan kalmasın
      if (descendantIds.length > 0) {
        await tx.pageSection.deleteMany({
          where: { id: { in: descendantIds }, pageId: section.pageId },
        });
      }

      await tx.pageSection.delete({ where: { id: sectionId } });
    });

    // Sayfa genelinde yetim çocuk kalırsa temizle (eski cascade boşluğu)
    await cleanupOrphanPageSections(section.pageId);

    await purgeUnreferencedEditorUploads(editorPaths);

    revalidatePath(`/admin/pages/${section.page.id}/edit`);
    revalidatePublicPage(section.page.slug);

    const nested = section._count.children;
    return {
      success: true,
      message:
        nested > 0
          ? `Bölüm ve içindeki ${nested} alt bölüm silindi.`
          : "Bölüm silindi.",
    };
  } catch (error) {
    console.error(error);
    return { error: "Bölüm silinirken hata oluştu." };
  }
}

/** parentId zincirindeki tüm alt bölüm id’leri (BFS) */
async function collectDescendantSectionIds(rootId: string): Promise<string[]> {
  const collected: string[] = [];
  let frontier = [rootId];

  while (frontier.length > 0) {
    const children = await prisma.pageSection.findMany({
      where: { parentId: { in: frontier } },
      select: { id: true },
    });
    const ids = children.map((row) => row.id);
    if (ids.length === 0) break;
    collected.push(...ids);
    frontier = ids;
  }

  return collected;
}

/** parentId dolu ama üst kayıt yoksa yetimleri sil */
async function cleanupOrphanPageSections(pageId: string) {
  const orphans = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT c.id AS id
     FROM page_sections c
     LEFT JOIN page_sections p ON p.id = c.parentId
     WHERE c.pageId = ? AND c.parentId IS NOT NULL AND p.id IS NULL`,
    pageId,
  );
  if (!orphans.length) return;

  const ids = orphans.map((row) => row.id);

  const orphanContents = await prisma.pageSection.findMany({
    where: { id: { in: ids } },
    select: { content: true },
  });
  const editorPaths = collectEditorUploadPathsFromHtmlList(
    orphanContents.map((row) => row.content),
  );

  await prisma.$transaction([
    prisma.pageSectionCard.deleteMany({ where: { sectionId: { in: ids } } }),
    prisma.pageSectionProject.deleteMany({ where: { sectionId: { in: ids } } }),
    prisma.pageSectionPost.deleteMany({ where: { sectionId: { in: ids } } }),
    prisma.pageSectionWork.deleteMany({ where: { sectionId: { in: ids } } }),
    prisma.pageSection.deleteMany({ where: { id: { in: ids }, pageId } }),
  ]);

  await purgeUnreferencedEditorUploads(editorPaths);
}

export async function updatePageSectionHeaderAction(
  _prev: SectionFormState,
  formData: FormData,
): Promise<SectionFormState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const sectionId = String(formData.get("sectionId") ?? "").trim();
  if (!sectionId) return { error: "Bölüm bulunamadı." };

  try {
    const section = await prisma.pageSection.findUnique({
      where: { id: sectionId },
      include: { page: { select: { id: true, slug: true, type: true } } },
    });
    if (!section || section.page.type !== "ADVANCED") {
      return { error: "Bölüm bulunamadı." };
    }

    const type = section.type as PageSectionTypeValue;
    const labelRaw = String(formData.get("label") ?? "").trim();
    const titleRaw = String(formData.get("title") ?? "").trim();
    const subtitleRaw = String(formData.get("subtitle") ?? "").trim();
    const eyebrowRaw = String(formData.get("eyebrow") ?? "").trim();
    const anchorIdRaw = String(formData.get("anchorId") ?? "").trim();

    const existingSettings = parseSectionSettings(section.settings);
    const settings = stringifySectionSettings({
      ...existingSettings,
      ...(formData.has("anchorId")
        ? { anchorId: anchorIdRaw || undefined }
        : {}),
      ...(sectionSupportsEyebrow(type) && formData.has("eyebrow")
        ? { eyebrow: eyebrowRaw || undefined }
        : {}),
      ...(existingSettings.gridCol ? { gridCol: existingSettings.gridCol } : {}),
      ...(type === "GRID_ROW" && existingSettings.gridRow
        ? { gridRow: existingSettings.gridRow }
        : {}),
    });

    await prisma.pageSection.update({
      where: { id: sectionId },
      data: {
        ...(formData.has("label") ? { label: labelRaw || null } : {}),
        title: titleRaw || null,
        subtitle: subtitleRaw || null,
        settings,
      },
    });

    revalidatePath(`/admin/pages/${section.page.id}/edit`);
    revalidatePublicPage(section.page.slug);
    return { success: true, message: "Başlık kaydedildi." };
  } catch (error) {
    console.error(error);
    return { error: "Başlık kaydedilirken hata oluştu." };
  }
}

export async function movePageSectionAction(
  sectionId: string,
  direction: "up" | "down",
): Promise<SectionFormState> {
  try {
    await requireAdmin();
    const section = await prisma.pageSection.findUnique({
      where: { id: sectionId },
      include: { page: { select: { id: true, slug: true, type: true } } },
    });
    if (!section || section.page.type !== "ADVANCED") {
      return { error: "Bölüm bulunamadı." };
    }

    const siblings = await prisma.pageSection.findMany({
      where: { pageId: section.pageId, parentId: section.parentId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, sortOrder: true },
    });
    const index = siblings.findIndex((item) => item.id === sectionId);
    if (index < 0) return { error: "Bölüm bulunamadı." };
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= siblings.length) {
      return { success: true, message: "Sıra değişmedi." };
    }

    const current = siblings[index]!;
    const target = siblings[swapIndex]!;
    await prisma.$transaction([
      prisma.pageSection.update({
        where: { id: current.id },
        data: { sortOrder: target.sortOrder },
      }),
      prisma.pageSection.update({
        where: { id: target.id },
        data: { sortOrder: current.sortOrder },
      }),
    ]);

    // Normalize order to avoid collisions
    const refreshed = await prisma.pageSection.findMany({
      where: { pageId: section.pageId, parentId: section.parentId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    });
    await prisma.$transaction(
      refreshed.map((item, order) =>
        prisma.pageSection.update({
          where: { id: item.id },
          data: { sortOrder: order },
        }),
      ),
    );

    revalidatePath(`/admin/pages/${section.page.id}/edit`);
    revalidatePublicPage(section.page.slug);
    return { success: true, message: "Sıra güncellendi." };
  } catch (error) {
    console.error(error);
    return { error: "Sıra güncellenirken hata oluştu." };
  }
}

export async function reorderPageSectionsAction(
  pageId: string,
  orderedIds: string[],
  parentId: string | null = null,
): Promise<SectionFormState> {
  try {
    await requireAdmin();
    const page = await requireAdvancedPage(pageId);

    const uniqueIds = [...new Set(orderedIds.map((id) => id.trim()).filter(Boolean))];
    if (uniqueIds.length === 0) {
      return { error: "Sıralama listesi boş." };
    }

    const existing = await prisma.pageSection.findMany({
      where: { pageId, parentId },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((item) => item.id));
    if (
      uniqueIds.length !== existing.length ||
      uniqueIds.some((id) => !existingIds.has(id))
    ) {
      return { error: "Bölüm listesi güncel değil; sayfayı yenileyip tekrar deneyin." };
    }

    await prisma.$transaction(
      uniqueIds.map((id, order) =>
        prisma.pageSection.update({
          where: { id },
          data: { sortOrder: order },
        }),
      ),
    );

    revalidatePath(`/admin/pages/${pageId}/edit`);
    revalidatePublicPage(page.slug);
    return { success: true, message: "Sıra kaydedildi." };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return { error: "Oturum bulunamadı." };
      if (error.message === "PAGE_NOT_FOUND") return { error: "Sayfa bulunamadı." };
      if (error.message === "NOT_ADVANCED") return { error: "Bu sayfa gelişmiş değil." };
    }
    console.error(error);
    return { error: "Sıra kaydedilirken hata oluştu." };
  }
}

/** Grid satırı çocuklarını kolon + sıra olarak kaydet */
export async function reorderGridChildrenAction(
  pageId: string,
  gridSectionId: string,
  placements: { id: string; columnId: string }[],
): Promise<SectionFormState> {
  try {
    await requireAdmin();
    const page = await requireAdvancedPage(pageId);

    const grid = await prisma.pageSection.findFirst({
      where: { id: gridSectionId, pageId, type: "GRID_ROW" },
      select: { id: true, settings: true },
    });
    if (!grid) return { error: "Grid satırı bulunamadı." };

    const gridSettings = parseSectionSettings(grid.settings);
    const columnIds = new Set(
      (gridSettings.gridRow?.columns ?? []).map((column) => column.id),
    );
    if (columnIds.size === 0) return { error: "Grid kolonları tanımlı değil." };

    const unique = new Map<string, string>();
    for (const item of placements) {
      const id = item.id.trim();
      const columnId = item.columnId.trim();
      if (!id || !columnId) continue;
      if (!columnIds.has(columnId)) {
        return { error: "Geçersiz kolon seçildi." };
      }
      unique.set(id, columnId);
    }

    const children = await prisma.pageSection.findMany({
      where: { pageId, parentId: gridSectionId },
      select: { id: true, settings: true },
    });
    const childIds = new Set(children.map((item) => item.id));
    if (
      unique.size !== children.length ||
      [...unique.keys()].some((id) => !childIds.has(id))
    ) {
      return { error: "Bölüm listesi güncel değil; sayfayı yenileyip tekrar deneyin." };
    }

    const byId = new Map(children.map((item) => [item.id, item]));
    await prisma.$transaction(
      [...unique.entries()].map(([id, columnId], order) => {
        const child = byId.get(id)!;
        const settings = parseSectionSettings(child.settings);
        settings.gridCol = { columnId };
        return prisma.pageSection.update({
          where: { id },
          data: {
            sortOrder: order,
            settings:
              stringifySectionSettings(settings) ??
              JSON.stringify({ gridCol: { columnId } }),
          },
        });
      }),
    );

    revalidatePath(`/admin/pages/${pageId}/edit`);
    revalidatePublicPage(page.slug);
    return { success: true, message: "Grid sırası kaydedildi." };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return { error: "Oturum bulunamadı." };
      if (error.message === "PAGE_NOT_FOUND") return { error: "Sayfa bulunamadı." };
      if (error.message === "NOT_ADVANCED") return { error: "Bu sayfa gelişmiş değil." };
    }
    console.error(error);
    return { error: "Grid sırası kaydedilirken hata oluştu." };
  }
}

export async function updateGridRowLayoutAction(
  sectionId: string,
  payload: {
    presetId?: string;
    gutter?: number;
    alignItems?: "start" | "center" | "stretch";
    useContainer?: boolean;
    columnsJson?: string;
  },
): Promise<SectionFormState> {
  try {
    await requireAdmin();
    const section = await prisma.pageSection.findUnique({
      where: { id: sectionId },
      include: { page: { select: { id: true, slug: true, type: true } } },
    });
    if (!section || section.page.type !== "ADVANCED" || section.type !== "GRID_ROW") {
      return { error: "Grid satırı bulunamadı." };
    }

    const current = parseGridRowConfig(
      JSON.parse(section.settings || "{}")?.gridRow ?? {},
    ) ?? getDefaultGridRowConfig();

    let next = { ...current };
    if (payload.presetId) {
      next = applyGridPreset(next, payload.presetId);
    }
    if (payload.columnsJson) {
      const parsed = parseGridRowConfig({
        ...next,
        columns: JSON.parse(payload.columnsJson),
      });
      if (parsed) next = parsed;
    }
    if (
      typeof payload.gutter === "number" &&
      [0, 1, 2, 3, 4, 5].includes(payload.gutter)
    ) {
      next.gutter = payload.gutter as 0 | 1 | 2 | 3 | 4 | 5;
    }
    if (
      payload.alignItems === "start" ||
      payload.alignItems === "center" ||
      payload.alignItems === "stretch"
    ) {
      next.alignItems = payload.alignItems;
    }
    if (typeof payload.useContainer === "boolean") {
      next.useContainer = payload.useContainer;
    }

    const settingsObj = section.settings ? JSON.parse(section.settings) : {};
    settingsObj.gridRow = next;

    await prisma.pageSection.update({
      where: { id: sectionId },
      data: { settings: JSON.stringify(settingsObj) },
    });

    revalidatePath(`/admin/pages/${section.page.id}/edit`);
    revalidatePublicPage(section.page.slug);
    return { success: true, message: "Grid düzeni kaydedildi." };
  } catch (error) {
    console.error(error);
    return { error: "Grid düzeni kaydedilemedi." };
  }
}

export async function togglePageSectionActiveAction(
  sectionId: string,
): Promise<SectionFormState> {
  try {
    await requireAdmin();
    const section = await prisma.pageSection.findUnique({
      where: { id: sectionId },
      include: { page: { select: { id: true, slug: true, type: true } } },
    });
    if (!section || section.page.type !== "ADVANCED") {
      return { error: "Bölüm bulunamadı." };
    }

    await prisma.pageSection.update({
      where: { id: sectionId },
      data: { isActive: !section.isActive },
    });

    revalidatePath(`/admin/pages/${section.page.id}/edit`);
    revalidatePublicPage(section.page.slug);
    return { success: true, message: "Bölüm durumu güncellendi." };
  } catch (error) {
    console.error(error);
    return { error: "Durum güncellenirken hata oluştu." };
  }
}

export async function updatePageSectionAction(
  _prev: SectionFormState,
  formData: FormData,
): Promise<SectionFormState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const sectionId = String(formData.get("sectionId") ?? "").trim();
  if (!sectionId) return { error: "Bölüm bulunamadı." };

  try {
    const section = await prisma.pageSection.findUnique({
      where: { id: sectionId },
      include: { page: { select: { id: true, slug: true, type: true } } },
    });
    if (!section || section.page.type !== "ADVANCED") {
      return { error: "Bölüm bulunamadı." };
    }

    const type = section.type as PageSectionTypeValue;
    const label = String(formData.get("label") ?? "").trim() || null;
    const title = String(formData.get("title") ?? "").trim() || null;
    const subtitle = String(formData.get("subtitle") ?? "").trim() || null;
    const content = String(formData.get("content") ?? "").trim() || null;
    const heroId = String(formData.get("heroId") ?? "").trim() || null;
    const faqGroupId = String(formData.get("faqGroupId") ?? "").trim() || null;
    const projectCategoryId =
      String(formData.get("projectCategoryId") ?? "").trim() || null;
    const workCategoryId =
      String(formData.get("workCategoryId") ?? "").trim() || null;
    const blogCategoryId =
      String(formData.get("blogCategoryId") ?? "").trim() || null;
    const limitRaw = Number.parseInt(String(formData.get("limit") ?? ""), 10);
    const showFeatures =
      formData.get("showFeatures") === "on" ||
      formData.get("showFeatures") === "true";
    const anchorId = String(formData.get("anchorId") ?? "").trim();
    const eyebrow = String(formData.get("eyebrow") ?? "").trim();
    const statValue = String(formData.get("statValue") ?? "").trim();
    const statDescription = String(formData.get("statDescription") ?? "").trim();
    const ctaLabel = String(formData.get("ctaLabel") ?? "").trim();
    const ctaUrl = String(formData.get("ctaUrl") ?? "").trim();
    const pricingPrimaryCtaLabel = String(
      formData.get("pricingPrimaryCtaLabel") ?? "",
    ).trim();
    const pricingPrimaryCtaUrl = String(
      formData.get("pricingPrimaryCtaUrl") ?? "",
    ).trim();
    const pricingSecondaryCtaLabel = String(
      formData.get("pricingSecondaryCtaLabel") ?? "",
    ).trim();
    const pricingSecondaryCtaUrl = String(
      formData.get("pricingSecondaryCtaUrl") ?? "",
    ).trim();
    const showPrimaryCta =
      formData.get("showPrimaryCta") === "on" ||
      formData.get("showPrimaryCta") === "true";
    const primaryCtaLabel = String(formData.get("primaryCtaLabel") ?? "").trim();
    const primaryCtaUrl = String(formData.get("primaryCtaUrl") ?? "").trim();
    const showSecondaryCta =
      formData.get("showSecondaryCta") === "on" ||
      formData.get("showSecondaryCta") === "true";
    const secondaryCtaLabel = String(
      formData.get("secondaryCtaLabel") ?? "",
    ).trim();
    const secondaryCtaUrl = String(formData.get("secondaryCtaUrl") ?? "").trim();
    const enableSlider =
      formData.get("enableSlider") === "on" ||
      formData.get("enableSlider") === "true";
    const sliderAutoplay =
      formData.get("sliderAutoplay") === "on" ||
      formData.get("sliderAutoplay") === "true";
    const sliderEffectRaw = String(formData.get("sliderEffect") ?? "slide").trim();
    const cardsPerRowRaw = Number.parseInt(
      String(formData.get("cardsPerRow") ?? "3"),
      10,
    );
    const cardsPerRow =
      cardsPerRowRaw === 4 || cardsPerRowRaw === 5 ? cardsPerRowRaw : 3;

    const contactSubmitLabel = String(
      formData.get("contactSubmitLabel") ?? "",
    ).trim();
    const contactSuccessMessage = String(
      formData.get("contactSuccessMessage") ?? "",
    ).trim();
    const contactFields = parseContactFormFieldsJson(
      String(formData.get("contactFormFieldsJson") ?? ""),
    );

    const contactInfoIntroText = String(
      formData.get("contactInfoIntroText") ?? "",
    ).trim();
    const contactInfoShowEmail =
      formData.get("contactInfoShowEmail") === "on" ||
      formData.get("contactInfoShowEmail") === "true";
    const contactInfoShowPhone =
      formData.get("contactInfoShowPhone") === "on" ||
      formData.get("contactInfoShowPhone") === "true";
    const contactInfoShowWhatsapp =
      formData.get("contactInfoShowWhatsapp") === "on" ||
      formData.get("contactInfoShowWhatsapp") === "true";
    const contactInfoShowAddress =
      formData.get("contactInfoShowAddress") === "on" ||
      formData.get("contactInfoShowAddress") === "true";
    const contactInfoShowWorkingHours =
      formData.get("contactInfoShowWorkingHours") === "on" ||
      formData.get("contactInfoShowWorkingHours") === "true";
    const contactInfoShowMap =
      formData.get("contactInfoShowMap") === "on" ||
      formData.get("contactInfoShowMap") === "true";

    const existingSettings = parseSectionSettings(section.settings);

    const removedEditorPaths =
      type === "RICH_TEXT" || type === "CTA"
        ? diffRemovedEditorUploadPaths(section.content, content)
        : [];

    const cardIds = formData
      .getAll("cardIds")
      .map((value) => String(value).trim())
      .filter(Boolean);
    const projectIds = formData
      .getAll("projectIds")
      .map((value) => String(value).trim())
      .filter(Boolean);
    const postIds = formData
      .getAll("postIds")
      .map((value) => String(value).trim())
      .filter(Boolean);
    const workIds = formData
      .getAll("workIds")
      .map((value) => String(value).trim())
      .filter(Boolean);

    const settings = stringifySectionSettings({
      limit: Number.isFinite(limitRaw) ? limitRaw : defaultLimitForType(type),
      showFeatures: type === "PROJECTS" ? showFeatures : undefined,
      anchorId: anchorId || undefined,
      eyebrow: sectionSupportsEyebrow(type) ? eyebrow || undefined : undefined,
      ...(type === "PROJECTS"
        ? {
            statValue: statValue || undefined,
            statDescription: statDescription || undefined,
          }
        : {}),
      ctaLabel: type === "CTA" ? ctaLabel || undefined : undefined,
      ctaUrl: type === "CTA" ? ctaUrl || undefined : undefined,
      ...(type === "PRICING"
        ? {
            pricingPrimaryCtaLabel: pricingPrimaryCtaLabel || undefined,
            pricingPrimaryCtaUrl: pricingPrimaryCtaUrl || undefined,
            pricingSecondaryCtaLabel: pricingSecondaryCtaLabel || undefined,
            pricingSecondaryCtaUrl: pricingSecondaryCtaUrl || undefined,
          }
        : {}),
      ...(type === "CARDS"
        ? {
            showPrimaryCta,
            primaryCtaLabel: primaryCtaLabel || undefined,
            primaryCtaUrl: primaryCtaUrl || undefined,
            showSecondaryCta,
            secondaryCtaLabel: secondaryCtaLabel || undefined,
            secondaryCtaUrl: secondaryCtaUrl || undefined,
          }
        : {}),
      ...(type === "CARDS" || type === "BLOG"
        ? {
            enableSlider,
            sliderAutoplay: enableSlider ? sliderAutoplay : undefined,
            sliderEffect:
              sliderEffectRaw === "fade" ||
              sliderEffectRaw === "coverflow" ||
              sliderEffectRaw === "cards" ||
              sliderEffectRaw === "slide"
                ? sliderEffectRaw
                : "slide",
            cardsPerRow,
          }
        : {}),
      ...(type === "CONTACT_FORM"
        ? {
            contactForm: {
              submitLabel: contactSubmitLabel || undefined,
              successMessage: contactSuccessMessage || undefined,
              fields: contactFields,
            },
          }
        : {}),
      ...(type === "CONTACT_INFO"
        ? {
            contactInfoBlock: {
              showEmail: contactInfoShowEmail,
              showPhone: contactInfoShowPhone,
              showWhatsapp: contactInfoShowWhatsapp,
              showAddress: contactInfoShowAddress,
              showWorkingHours: contactInfoShowWorkingHours,
              showMap: contactInfoShowMap,
              introText: contactInfoIntroText || undefined,
            },
          }
        : {}),
      ...(existingSettings.gridCol ? { gridCol: existingSettings.gridCol } : {}),
      ...(type === "GRID_ROW" && existingSettings.gridRow
        ? { gridRow: existingSettings.gridRow }
        : {}),
    });

    await prisma.$transaction(async (tx) => {
      await tx.pageSection.update({
        where: { id: sectionId },
        data: {
          label,
          title,
          subtitle,
          content,
          settings,
          heroId: type === "HERO" ? heroId : null,
          faqGroupId: type === "FAQ" ? faqGroupId : null,
          projectCategoryId: type === "PROJECTS" ? projectCategoryId : null,
          workCategoryId: type === "WORKS" ? workCategoryId : null,
          blogCategoryId: type === "BLOG" ? blogCategoryId : null,
        },
      });

      if (type === "CARDS" || type === "ADVANCED_CARD") {
        await tx.pageSectionCard.deleteMany({ where: { sectionId } });
        if (cardIds.length > 0) {
          await tx.pageSectionCard.createMany({
            data: cardIds.map((cardId, index) => ({
              sectionId,
              cardId,
              sortOrder: index,
            })),
          });
        }
      }

      if (type === "PROJECTS") {
        await tx.pageSectionProject.deleteMany({ where: { sectionId } });
        if (projectIds.length > 0) {
          await tx.pageSectionProject.createMany({
            data: projectIds.map((projectId, index) => ({
              sectionId,
              projectId,
              sortOrder: index,
            })),
          });
        }
      }

      if (type === "BLOG") {
        await tx.pageSectionPost.deleteMany({ where: { sectionId } });
        if (postIds.length > 0) {
          await tx.pageSectionPost.createMany({
            data: postIds.map((postId, index) => ({
              sectionId,
              postId,
              sortOrder: index,
            })),
          });
        }
      }

      if (type === "WORKS") {
        await tx.pageSectionWork.deleteMany({ where: { sectionId } });
        if (workIds.length > 0) {
          await tx.pageSectionWork.createMany({
            data: workIds.map((workId, index) => ({
              sectionId,
              workId,
              sortOrder: index,
            })),
          });
        }
      }
    });

    if (removedEditorPaths.length > 0) {
      await purgeUnreferencedEditorUploads(removedEditorPaths);
    }

    revalidatePath(`/admin/pages/${section.page.id}/edit`);
    revalidatePublicPage(section.page.slug);
    return { success: true, message: "Bölüm kaydedildi." };
  } catch (error) {
    console.error(error);
    return { error: "Bölüm kaydedilirken hata oluştu." };
  }
}
