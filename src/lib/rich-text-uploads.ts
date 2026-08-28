import { prisma } from "@/lib/prisma";
import { deletePublicAsset } from "@/lib/uploads";

export const EDITOR_UPLOAD_PREFIX = "/uploads/editor/";

/** Editör yüklemesi yolunu güvenli şekilde normalize eder. */
export function normalizeEditorUploadPath(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const raw = input.trim();
  if (!raw) return null;

  try {
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      const url = new URL(raw);
      return url.pathname.startsWith(EDITOR_UPLOAD_PREFIX) ? url.pathname : null;
    }
  } catch {
    return null;
  }

  const path = raw.split("?")[0].split("#")[0];
  if (!path.startsWith(EDITOR_UPLOAD_PREFIX) || path.includes("..")) {
    return null;
  }
  return path;
}

/** HTML içindeki editör görsellerinin public yollarını döner. */
export function extractEditorUploadPathsFromHtml(
  html: string | null | undefined,
): string[] {
  if (!html?.trim()) return [];

  const found = new Set<string>();
  const imgSrcPattern = /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = imgSrcPattern.exec(html)) !== null) {
    const normalized = normalizeEditorUploadPath(match[1]);
    if (normalized) found.add(normalized);
  }

  // data-src veya düz metin yedek taraması
  const loosePattern = /\/uploads\/editor\/[a-zA-Z0-9._-]+\.(?:webp|png|jpe?g|gif)/gi;
  while ((match = loosePattern.exec(html)) !== null) {
    const normalized = normalizeEditorUploadPath(match[0]);
    if (normalized) found.add(normalized);
  }

  return [...found];
}

export function diffRemovedEditorUploadPaths(
  previousHtml: string | null | undefined,
  nextHtml: string | null | undefined,
): string[] {
  const prev = new Set(extractEditorUploadPathsFromHtml(previousHtml));
  const next = new Set(extractEditorUploadPathsFromHtml(nextHtml));
  return [...prev].filter((path) => !next.has(path));
}

type ReferenceCheckOptions = {
  excludePageIds?: string[];
  excludeSectionIds?: string[];
  excludePricingPlanIds?: string[];
};

async function isEditorUploadPathReferenced(
  uploadPath: string,
  options: ReferenceCheckOptions = {},
): Promise<boolean> {
  const excludePageIds = options.excludePageIds ?? [];
  const excludeSectionIds = options.excludeSectionIds ?? [];
  const excludePricingPlanIds = options.excludePricingPlanIds ?? [];

  const contains = { contains: uploadPath };

  const [
    pageSection,
    page,
    blogPost,
    work,
    project,
    workCategory,
    projectCategory,
    blogCategory,
    card,
    faqItem,
    pricingPlan,
  ] = await Promise.all([
    prisma.pageSection.findFirst({
      where: {
        ...(excludeSectionIds.length ? { id: { notIn: excludeSectionIds } } : {}),
        content: contains,
      },
      select: { id: true },
    }),
    prisma.page.findFirst({
      where: {
        ...(excludePageIds.length ? { id: { notIn: excludePageIds } } : {}),
        OR: [{ content: contains }, { summary: contains }],
      },
      select: { id: true },
    }),
    prisma.blogPost.findFirst({
      where: { OR: [{ content: contains }, { summary: contains }] },
      select: { id: true },
    }),
    prisma.work.findFirst({
      where: { OR: [{ content: contains }, { summary: contains }] },
      select: { id: true },
    }),
    prisma.project.findFirst({
      where: { OR: [{ content: contains }, { summary: contains }] },
      select: { id: true },
    }),
    prisma.workCategory.findFirst({
      where: { content: contains },
      select: { id: true },
    }),
    prisma.projectCategory.findFirst({
      where: { content: contains },
      select: { id: true },
    }),
    prisma.blogCategory.findFirst({
      where: { content: contains },
      select: { id: true },
    }),
    prisma.card.findFirst({
      where: { description: contains },
      select: { id: true },
    }),
    prisma.faqItem.findFirst({
      where: { answer: contains },
      select: { id: true },
    }),
    prisma.pricingPlan.findFirst({
      where: {
        ...(excludePricingPlanIds.length
          ? { id: { notIn: excludePricingPlanIds } }
          : {}),
        detailContent: contains,
      },
      select: { id: true },
    }),
  ]);

  return Boolean(
    pageSection ||
      page ||
      blogPost ||
      work ||
      project ||
      workCategory ||
      projectCategory ||
      blogCategory ||
      card ||
      faqItem ||
      pricingPlan,
  );
}

/**
 * Veritabanında artık referansı kalmayan editör görsellerini FTP/public’ten siler.
 * @returns Silinen dosya sayısı
 */
export async function purgeUnreferencedEditorUploads(
  paths: Iterable<string>,
  options: ReferenceCheckOptions = {},
): Promise<number> {
  const unique = [
    ...new Set(
      [...paths]
        .map((item) => normalizeEditorUploadPath(item))
        .filter((item): item is string => Boolean(item)),
    ),
  ];

  if (unique.length === 0) return 0;

  let deleted = 0;
  for (const uploadPath of unique) {
    const stillUsed = await isEditorUploadPathReferenced(uploadPath, options);
    if (stillUsed) continue;
    const ok = await deletePublicAsset(uploadPath);
    if (ok) deleted += 1;
  }

  return deleted;
}

/** Birden fazla HTML içeriğinden yolları toplar. */
export function collectEditorUploadPathsFromHtmlList(
  htmlList: Array<string | null | undefined>,
): string[] {
  const all = new Set<string>();
  for (const html of htmlList) {
    for (const path of extractEditorUploadPathsFromHtml(html)) {
      all.add(path);
    }
  }
  return [...all];
}
