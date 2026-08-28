"use server";

import { revalidatePath } from "next/cache";
import type { HeroLayout, HeroMediaKind, Prisma } from "@prisma/client";
import { auth } from "@/auth";
import {
  HERO_BACKGROUND_STYLES,
  HERO_LAYOUTS,
  HERO_MEDIA_LIMITS,
  type HeroBackgroundStyle,
  type HeroLayoutValue,
  type HeroMediaKindValue,
} from "@/lib/heroes";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import {
  deletePublicAsset,
  saveOptimizedImage,
  uploadLimits,
} from "@/lib/uploads";

export type HeroFormState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export type DeleteHeroResult = {
  success?: boolean;
  error?: string;
  message?: string;
};

function heroWriteErrorMessage(error: unknown, fallback: string) {
  const text = error instanceof Error ? error.message : String(error);
  if (
    /kicker|ctaSecondaryLabel|ctaSecondaryUrl|Unknown argument|P2022|does not exist|Unknown column/i.test(
      text,
    )
  ) {
    return "Veritabanı şeması güncel değil. Sunucuda `npx prisma db push` çalıştırıp ardından `npx prisma generate` ve `pm2 restart` yapın.";
  }
  return fallback;
}

type MediaOrderItem =
  | { type: "existing"; id: string; kind: HeroMediaKindValue; label?: string; alt?: string; href?: string }
  | { type: "new"; index: number; kind: HeroMediaKindValue; label?: string; alt?: string; href?: string };

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHORIZED");
  return session;
}

async function uniqueHeroSlug(base: string, excludeId?: string) {
  const slug = slugify(base) || "hero";
  let candidate = slug;
  let i = 2;
  while (true) {
    const existing = await prisma.hero.findFirst({
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

function parseOptionalInt(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number.parseInt(trimmed, 10);
  return Number.isFinite(value) ? value : null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isHeroLayout(value: string): value is HeroLayoutValue {
  return HERO_LAYOUTS.some((item) => item.value === value);
}

function isBackgroundStyle(value: string): value is HeroBackgroundStyle {
  return HERO_BACKGROUND_STYLES.some((item) => item.value === value);
}

function isMediaKind(value: string): value is HeroMediaKindValue {
  return value === "LOGO" || value === "COLLAGE" || value === "AVATAR";
}

function parseMediaOrder(raw: string): MediaOrderItem[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item): MediaOrderItem | null => {
        if (!item || typeof item !== "object") return null;
        const row = item as Record<string, unknown>;
        const kind = String(row.kind ?? "");
        if (!isMediaKind(kind)) return null;
        if (row.type === "existing" && typeof row.id === "string") {
          return {
            type: "existing",
            id: row.id,
            kind,
            label: typeof row.label === "string" ? row.label : undefined,
            alt: typeof row.alt === "string" ? row.alt : undefined,
            href: typeof row.href === "string" ? row.href : undefined,
          };
        }
        if (row.type === "new" && typeof row.index === "number") {
          return {
            type: "new",
            index: row.index,
            kind,
            label: typeof row.label === "string" ? row.label : undefined,
            alt: typeof row.alt === "string" ? row.alt : undefined,
            href: typeof row.href === "string" ? row.href : undefined,
          };
        }
        return null;
      })
      .filter((item): item is MediaOrderItem => Boolean(item));
  } catch {
    return [];
  }
}

async function syncSlideMedia(
  slideId: string,
  order: MediaOrderItem[],
  files: File[],
) {
  const counts: Record<HeroMediaKindValue, number> = {
    LOGO: 0,
    COLLAGE: 0,
    AVATAR: 0,
  };

  const keepIds = new Set(
    order.filter((item) => item.type === "existing").map((item) => item.id),
  );

  const existing = await prisma.heroSlideMedia.findMany({
    where: { slideId },
  });

  for (const row of existing) {
    if (!keepIds.has(row.id)) {
      await prisma.heroSlideMedia.delete({ where: { id: row.id } });
      await deletePublicAsset(row.image);
    }
  }

  let sortOrder = 0;
  for (const item of order) {
    if (counts[item.kind] >= HERO_MEDIA_LIMITS[item.kind]) continue;
    counts[item.kind] += 1;

    if (item.type === "existing") {
      await prisma.heroSlideMedia.update({
        where: { id: item.id },
        data: {
          sortOrder,
          kind: item.kind as HeroMediaKind,
          label: item.label?.trim() || null,
          alt: item.alt?.trim() || null,
          href: item.href?.trim() || null,
        },
      });
      sortOrder += 1;
      continue;
    }

    const file = files[item.index];
    if (!(file instanceof File) || file.size <= 0) continue;

    const saved = await saveOptimizedImage(file, {
      uploadDir: "uploads/heroes",
      maxBytes: uploadLimits.image,
      mode: file.type === "image/svg+xml" ? "preserve" : "webp",
      quality: 82,
    });

    await prisma.heroSlideMedia.create({
      data: {
        slideId,
        kind: item.kind as HeroMediaKind,
        image: saved.publicPath,
        label: item.label?.trim() || null,
        alt: item.alt?.trim() || null,
        href: item.href?.trim() || null,
        sortOrder,
      },
    });
    sortOrder += 1;
  }
}

function parseHeroPayload(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const sortOrder = Number.parseInt(String(formData.get("sortOrder") ?? "0"), 10);
  const intervalMs = Number.parseInt(String(formData.get("intervalMs") ?? "6000"), 10);
  const isActive = formData.get("isActive") === "on" || formData.get("isActive") === "true";
  const autoplay = formData.get("autoplay") === "on" || formData.get("autoplay") === "true";
  const showDots = formData.get("showDots") === "on" || formData.get("showDots") === "true";
  const showArrows = formData.get("showArrows") === "on" || formData.get("showArrows") === "true";

  return {
    name,
    slugInput,
    description,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    intervalMs: Number.isFinite(intervalMs) ? clamp(intervalMs, 2000, 30000) : 6000,
    isActive,
    autoplay,
    showDots,
    showArrows,
  };
}

function parseSlidePayload(formData: FormData) {
  const label = String(formData.get("label") ?? "").trim();
  const badgeText = String(formData.get("badgeText") ?? "").trim();
  const badgeIcon = String(formData.get("badgeIcon") ?? "").trim();
  const kicker = String(formData.get("kicker") ?? "").trim();
  const headline = String(formData.get("headline") ?? "").trim();
  const headlineAccent = String(formData.get("headlineAccent") ?? "").trim();
  const subheadline = String(formData.get("subheadline") ?? "").trim();
  const ctaLabel = String(formData.get("ctaLabel") ?? "").trim();
  const ctaUrl = String(formData.get("ctaUrl") ?? "").trim();
  const ctaSecondaryLabel = String(formData.get("ctaSecondaryLabel") ?? "").trim();
  const ctaSecondaryUrl = String(formData.get("ctaSecondaryUrl") ?? "").trim();
  const trustLabel = String(formData.get("trustLabel") ?? "").trim();
  const overlayPercent = Number.parseInt(String(formData.get("overlayPercent") ?? "0"), 10);
  const titleColor = String(formData.get("titleColor") ?? "#0f172a").trim() || "#0f172a";
  const accentColor = String(formData.get("accentColor") ?? "#7c3aed").trim() || "#7c3aed";
  const subtitleColor = String(formData.get("subtitleColor") ?? "#64748b").trim() || "#64748b";
  const ctaBgColor = String(formData.get("ctaBgColor") ?? "#7c3aed").trim() || "#7c3aed";
  const ctaTextColor = String(formData.get("ctaTextColor") ?? "#ffffff").trim() || "#ffffff";
  const titleFont = String(formData.get("titleFont") ?? "").trim();
  const themeColor = String(formData.get("themeColor") ?? "").trim();
  const layoutRaw = String(formData.get("layout") ?? "SPLIT_COLLAGE").trim();
  const backgroundRaw = String(formData.get("backgroundStyle") ?? "grid").trim();
  const starCount = Number.parseInt(String(formData.get("starCount") ?? "5"), 10);
  const sortOrder = Number.parseInt(String(formData.get("sortOrder") ?? "0"), 10);
  const isActive = formData.get("isActive") === "on" || formData.get("isActive") === "true";
  const showStars = formData.get("showStars") === "on" || formData.get("showStars") === "true";
  const showAvatars = formData.get("showAvatars") === "on" || formData.get("showAvatars") === "true";
  const mediaOrder = parseMediaOrder(String(formData.get("media_order") ?? "[]"));
  const mediaFiles = formData
    .getAll("media_files")
    .filter((value): value is File => value instanceof File && value.size > 0);
  const existingBackgroundImage = String(formData.get("backgroundImage") ?? "").trim();
  const backgroundImageFile = formData.get("background_image_file");

  return {
    label,
    badgeText,
    badgeIcon,
    kicker,
    headline,
    headlineAccent,
    subheadline,
    ctaLabel,
    ctaUrl,
    ctaSecondaryLabel,
    ctaSecondaryUrl,
    trustLabel,
    overlayPercent: Number.isFinite(overlayPercent) ? clamp(overlayPercent, 0, 80) : 0,
    titleColor,
    accentColor,
    subtitleColor,
    ctaBgColor,
    ctaTextColor,
    titleFont,
    themeColor,
    titleSizePx: parseOptionalInt(String(formData.get("titleSizePx") ?? "")),
    subtitleSizePx: parseOptionalInt(String(formData.get("subtitleSizePx") ?? "")),
    imageWidthPx: parseOptionalInt(String(formData.get("imageWidthPx") ?? "")),
    imageHeightPx: parseOptionalInt(String(formData.get("imageHeightPx") ?? "")),
    layout: (isHeroLayout(layoutRaw) ? layoutRaw : "SPLIT_COLLAGE") as HeroLayout,
    backgroundStyle: isBackgroundStyle(backgroundRaw) ? backgroundRaw : "grid",
    existingBackgroundImage,
    backgroundImageFile,
    starCount: Number.isFinite(starCount) ? clamp(starCount, 1, 5) : 5,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    isActive,
    showStars,
    showAvatars,
    mediaOrder,
    mediaFiles,
  };
}

async function resolveBackgroundImage(
  existingPath: string | null | undefined,
  payload: {
    existingBackgroundImage: string;
    backgroundImageFile: FormDataEntryValue | null;
  },
) {
  let backgroundImage = payload.existingBackgroundImage;

  if (
    payload.backgroundImageFile instanceof File &&
    payload.backgroundImageFile.size > 0
  ) {
    const saved = await saveOptimizedImage(payload.backgroundImageFile, {
      uploadDir: "uploads/heroes/backgrounds",
      maxBytes: uploadLimits.image,
      mode: "webp",
      quality: 82,
      previousPath: existingPath || undefined,
    });
    backgroundImage = saved.publicPath;
  } else if (!backgroundImage && existingPath) {
    await deletePublicAsset(existingPath);
    backgroundImage = "";
  }

  return backgroundImage || null;
}

export async function createHeroAction(
  _prev: HeroFormState,
  formData: FormData,
): Promise<HeroFormState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const data = parseHeroPayload(formData);
  if (!data.name) {
    return { error: "Ad zorunludur.", fieldErrors: { name: "Zorunlu alan" } };
  }

  try {
    const slug = await uniqueHeroSlug(data.slugInput || data.name);
    let sortOrder = data.sortOrder;
    const sortOrderRaw = String(formData.get("sortOrder") ?? "").trim();
    if (sortOrderRaw === "") {
      const last = await prisma.hero.findFirst({
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      sortOrder = (last?.sortOrder ?? -1) + 1;
    }

    const created = await prisma.hero.create({
      data: {
        name: data.name,
        slug,
        description: data.description || null,
        sortOrder,
        isActive: data.isActive,
        autoplay: data.autoplay,
        intervalMs: data.intervalMs,
        showDots: data.showDots,
        showArrows: data.showArrows,
      },
    });

    revalidatePath("/admin/heroes");
    return {
      success: true,
      message: "Hero alanı oluşturuldu.",
      fieldErrors: { redirectId: created.id },
    };
  } catch (error) {
    console.error(error);
    return { error: "Hero alanı eklenirken bir hata oluştu." };
  }
}

export async function updateHeroAction(
  _prev: HeroFormState,
  formData: FormData,
): Promise<HeroFormState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Hero alanı bulunamadı." };

  const data = parseHeroPayload(formData);
  if (!data.name) {
    return { error: "Ad zorunludur.", fieldErrors: { name: "Zorunlu alan" } };
  }

  try {
    const existing = await prisma.hero.findUnique({ where: { id } });
    if (!existing) return { error: "Hero alanı bulunamadı." };

    const slug = await uniqueHeroSlug(data.slugInput || data.name, id);
    await prisma.hero.update({
      where: { id },
      data: {
        name: data.name,
        slug,
        description: data.description || null,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
        autoplay: data.autoplay,
        intervalMs: data.intervalMs,
        showDots: data.showDots,
        showArrows: data.showArrows,
      },
    });

    revalidatePath("/admin/heroes");
    revalidatePath(`/admin/heroes/${id}/edit`);
    return { success: true, message: "Hero alanı güncellendi." };
  } catch (error) {
    console.error(error);
    return { error: "Hero alanı güncellenirken bir hata oluştu." };
  }
}

export async function deleteHeroAction(formData: FormData): Promise<DeleteHeroResult> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Hero alanı bulunamadı." };

  const existing = await prisma.hero.findUnique({
    where: { id },
    include: { slides: { include: { media: true } } },
  });
  if (!existing) return { error: "Hero alanı bulunamadı." };

  const imagePaths = existing.slides.flatMap((slide) => [
    ...(slide.backgroundImage ? [slide.backgroundImage] : []),
    ...slide.media.map((item) => item.image),
  ]);

  await prisma.hero.delete({ where: { id } });
  await Promise.all(imagePaths.map((path) => deletePublicAsset(path)));

  revalidatePath("/admin/heroes");
  return { success: true, message: "Hero alanı silindi." };
}

export async function toggleHeroActiveAction(formData: FormData) {
  try {
    await requireAdmin();
  } catch {
    return;
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const existing = await prisma.hero.findUnique({ where: { id } });
  if (!existing) return;

  await prisma.hero.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });

  revalidatePath("/admin/heroes");
}

export async function createHeroSlideAction(
  _prev: HeroFormState,
  formData: FormData,
): Promise<HeroFormState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const heroId = String(formData.get("heroId") ?? "").trim();
  if (!heroId) return { error: "Hero alanı bulunamadı." };

  const data = parseSlidePayload(formData);
  if (!data.headline) {
    return { error: "Başlık zorunludur.", fieldErrors: { headline: "Zorunlu alan" } };
  }

  try {
    const hero = await prisma.hero.findUnique({ where: { id: heroId } });
    if (!hero) return { error: "Hero alanı bulunamadı." };

    let sortOrder = data.sortOrder;
    const sortOrderRaw = String(formData.get("sortOrder") ?? "").trim();
    if (sortOrderRaw === "") {
      const last = await prisma.heroSlide.findFirst({
        where: { heroId },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      sortOrder = (last?.sortOrder ?? -1) + 1;
    }

    const backgroundImage = await resolveBackgroundImage(null, {
      existingBackgroundImage: data.existingBackgroundImage,
      backgroundImageFile: data.backgroundImageFile,
    });

    const slideData: Prisma.HeroSlideCreateInput = {
      hero: { connect: { id: heroId } },
      label: data.label || null,
      isActive: data.isActive,
      sortOrder,
      badgeText: data.badgeText || null,
      badgeIcon: data.badgeIcon || null,
      kicker: data.kicker || null,
      headline: data.headline,
      headlineAccent: data.headlineAccent || null,
      subheadline: data.subheadline || null,
      ctaLabel: data.ctaLabel || null,
      ctaUrl: data.ctaUrl || null,
      ctaSecondaryLabel: data.ctaSecondaryLabel || null,
      ctaSecondaryUrl: data.ctaSecondaryUrl || null,
      trustLabel: data.trustLabel || null,
      overlayPercent: data.overlayPercent,
      titleColor: data.titleColor,
      accentColor: data.accentColor,
      subtitleColor: data.subtitleColor,
      ctaBgColor: data.ctaBgColor,
      ctaTextColor: data.ctaTextColor,
      titleFont: data.titleFont || null,
      titleSizePx: data.titleSizePx,
      subtitleSizePx: data.subtitleSizePx,
      imageWidthPx: data.imageWidthPx,
      imageHeightPx: data.imageHeightPx,
      layout: data.layout,
      backgroundStyle: data.backgroundStyle,
      backgroundImage,
      themeColor: data.themeColor || null,
      showStars: data.showStars,
      starCount: data.starCount,
      showAvatars: data.showAvatars,
    };

    const created = await prisma.heroSlide.create({ data: slideData });
    await syncSlideMedia(created.id, data.mediaOrder, data.mediaFiles);

    revalidatePath("/");
    revalidatePath("/admin/heroes");
    revalidatePath(`/admin/heroes/${heroId}/edit`);
    return {
      success: true,
      message: "Slayt oluşturuldu.",
      fieldErrors: { redirectHeroId: heroId },
    };
  } catch (error) {
    console.error(error);
    return { error: heroWriteErrorMessage(error, "Slayt eklenirken bir hata oluştu.") };
  }
}

export async function updateHeroSlideAction(
  _prev: HeroFormState,
  formData: FormData,
): Promise<HeroFormState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Slayt bulunamadı." };

  const data = parseSlidePayload(formData);
  if (!data.headline) {
    return { error: "Başlık zorunludur.", fieldErrors: { headline: "Zorunlu alan" } };
  }

  try {
    const existing = await prisma.heroSlide.findUnique({ where: { id } });
    if (!existing) return { error: "Slayt bulunamadı." };

    const backgroundImage = await resolveBackgroundImage(existing.backgroundImage, {
      existingBackgroundImage: data.existingBackgroundImage,
      backgroundImageFile: data.backgroundImageFile,
    });

    await prisma.heroSlide.update({
      where: { id },
      data: {
        label: data.label || null,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
        badgeText: data.badgeText || null,
        badgeIcon: data.badgeIcon || null,
        kicker: data.kicker || null,
        headline: data.headline,
        headlineAccent: data.headlineAccent || null,
        subheadline: data.subheadline || null,
        ctaLabel: data.ctaLabel || null,
        ctaUrl: data.ctaUrl || null,
        ctaSecondaryLabel: data.ctaSecondaryLabel || null,
        ctaSecondaryUrl: data.ctaSecondaryUrl || null,
        trustLabel: data.trustLabel || null,
        overlayPercent: data.overlayPercent,
        titleColor: data.titleColor,
        accentColor: data.accentColor,
        subtitleColor: data.subtitleColor,
        ctaBgColor: data.ctaBgColor,
        ctaTextColor: data.ctaTextColor,
        titleFont: data.titleFont || null,
        titleSizePx: data.titleSizePx,
        subtitleSizePx: data.subtitleSizePx,
        imageWidthPx: data.imageWidthPx,
        imageHeightPx: data.imageHeightPx,
        layout: data.layout,
        backgroundStyle: data.backgroundStyle,
        backgroundImage,
        themeColor: data.themeColor || null,
        showStars: data.showStars,
        starCount: data.starCount,
        showAvatars: data.showAvatars,
      },
    });

    await syncSlideMedia(id, data.mediaOrder, data.mediaFiles);

    revalidatePath("/");
    revalidatePath("/admin/heroes");
    revalidatePath(`/admin/heroes/${existing.heroId}/edit`);
    revalidatePath(`/admin/heroes/${existing.heroId}/slides/${id}/edit`);
    return {
      success: true,
      message: "Slayt güncellendi.",
      fieldErrors: { redirectHeroId: existing.heroId },
    };
  } catch (error) {
    console.error(error);
    return {
      error: heroWriteErrorMessage(error, "Slayt güncellenirken bir hata oluştu."),
    };
  }
}

export async function deleteHeroSlideAction(formData: FormData): Promise<DeleteHeroResult> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Slayt bulunamadı." };

  const existing = await prisma.heroSlide.findUnique({
    where: { id },
    include: { media: true },
  });
  if (!existing) return { error: "Slayt bulunamadı." };

  await prisma.heroSlide.delete({ where: { id } });
  await Promise.all([
    ...(existing.backgroundImage ? [deletePublicAsset(existing.backgroundImage)] : []),
    ...existing.media.map((item) => deletePublicAsset(item.image)),
  ]);

  revalidatePath("/");
  revalidatePath("/admin/heroes");
  revalidatePath(`/admin/heroes/${existing.heroId}/edit`);
  return { success: true, message: "Slayt silindi." };
}

export async function toggleHeroSlideActiveAction(formData: FormData) {
  try {
    await requireAdmin();
  } catch {
    return;
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const existing = await prisma.heroSlide.findUnique({ where: { id } });
  if (!existing) return;

  await prisma.heroSlide.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });

  revalidatePath("/");
  revalidatePath("/admin/heroes");
  revalidatePath(`/admin/heroes/${existing.heroId}/edit`);
}
