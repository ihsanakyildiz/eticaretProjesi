"use server";

import { revalidatePath } from "next/cache";
import type { CardLayout, CardMediaType, CardType } from "@prisma/client";
import { auth } from "@/auth";
import {
  isCardLayout,
  isCardType,
  serializeCardFeatures,
} from "@/lib/cards";
import { prisma } from "@/lib/prisma";
import {
  deletePublicAsset,
  saveOptimizedImage,
  uploadLimits,
} from "@/lib/uploads";

export type CardFormState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export type DeleteCardResult = {
  success?: boolean;
  error?: string;
  message?: string;
};

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHORIZED");
  return session;
}

function parseMediaType(raw: string): CardMediaType {
  return raw === "IMAGE" ? "IMAGE" : "ICON";
}

function parseFeaturesFromForm(formData: FormData): string[] {
  const multi = formData
    .getAll("features[]")
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
  if (multi.length > 0) return multi.slice(0, 12);

  const raw = String(formData.get("features") ?? "").trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => String(item ?? "").trim())
        .filter(Boolean)
        .slice(0, 12);
    }
  } catch {
    /* newline fallback */
  }
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function parseCardPayload(formData: FormData) {
  const typeRaw = String(formData.get("type") ?? "CLASSIC").trim();
  const type: CardType = isCardType(typeRaw) ? typeRaw : "CLASSIC";
  const layoutRaw = String(formData.get("layout") ?? "MEDIA_LEFT").trim();
  const layout: CardLayout = isCardLayout(layoutRaw) ? layoutRaw : "MEDIA_LEFT";

  const title = String(formData.get("title") ?? "").trim();
  const href = String(formData.get("href") ?? "").trim() || "#";
  const icon = String(formData.get("icon") ?? "").trim();
  const mediaType = parseMediaType(String(formData.get("mediaType") ?? "ICON"));
  const sortOrder = Number.parseInt(String(formData.get("sortOrder") ?? "0"), 10);
  const isActive =
    formData.get("isActive") === "on" || formData.get("isActive") === "true";

  const badgeText = String(formData.get("badgeText") ?? "").trim();
  const subtitle = String(formData.get("subtitle") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const features = parseFeaturesFromForm(formData);
  const showFrame =
    formData.get("showFrame") === "on" || formData.get("showFrame") === "true";
  const showSparkles =
    formData.get("showSparkles") === "on" ||
    formData.get("showSparkles") === "true";
  const videoLabel = String(formData.get("videoLabel") ?? "").trim();
  const videoUrl = String(formData.get("videoUrl") ?? "").trim();
  const profileName = String(formData.get("profileName") ?? "").trim();
  const profileRole = String(formData.get("profileRole") ?? "").trim();
  const existingImage = String(formData.get("image") ?? "").trim();
  const existingProfileImage = String(formData.get("profileImage") ?? "").trim();
  const imageFile = formData.get("image_file");
  const profileImageFile = formData.get("profile_image_file");
  const statValue = String(formData.get("statValue") ?? "").trim();
  const statLabel = String(formData.get("statLabel") ?? "").trim();

  return {
    type,
    layout,
    title,
    href,
    icon,
    mediaType,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    isActive,
    badgeText,
    subtitle,
    description,
    features,
    showFrame,
    showSparkles,
    videoLabel,
    videoUrl,
    profileName,
    profileRole,
    existingImage,
    existingProfileImage,
    imageFile,
    profileImageFile,
    statValue,
    statLabel,
  };
}

async function resolveNextSortOrder(explicit: number, sortOrderRaw: string) {
  if (sortOrderRaw !== "") return explicit;
  const last = await prisma.card.findFirst({
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  return (last?.sortOrder ?? -1) + 1;
}

export async function createCardAction(
  _prev: CardFormState,
  formData: FormData,
): Promise<CardFormState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const data = parseCardPayload(formData);
  const fieldErrors: Record<string, string> = {};

  if (!data.title) fieldErrors.title = "Kart başlığı zorunludur.";

  if (data.type === "CLASSIC") {
    if (!data.href || data.href === "#") {
      fieldErrors.href = "Sayfa linki zorunludur.";
    }
    if (data.mediaType === "ICON" && !data.icon) {
      fieldErrors.icon = "İkon seçin veya görsel tipine geçin.";
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { error: "Lütfen formu kontrol edin.", fieldErrors };
  }

  try {
    let image: string | null = null;
    let profileImage: string | null = null;

    const needsImage =
      data.type === "ADVANCED" ||
      (data.type === "CLASSIC" && data.mediaType === "IMAGE");

    if (needsImage) {
      if (data.imageFile instanceof File && data.imageFile.size > 0) {
        const saved = await saveOptimizedImage(data.imageFile, {
          uploadDir: "uploads/cards",
          maxBytes: uploadLimits.image,
          mode: "webp",
          quality: 82,
        });
        image = saved.publicPath;
      } else if (data.existingImage) {
        image = data.existingImage;
      } else if (data.type === "CLASSIC" && data.mediaType === "IMAGE") {
        return {
          error: "Görsel tipi için bir görsel yükleyin.",
          fieldErrors: { image: "Görsel zorunlu" },
        };
      }
    }

    if (data.type === "ADVANCED") {
      if (data.profileImageFile instanceof File && data.profileImageFile.size > 0) {
        const saved = await saveOptimizedImage(data.profileImageFile, {
          uploadDir: "uploads/cards",
          maxBytes: uploadLimits.image,
          mode: "webp",
          quality: 82,
        });
        profileImage = saved.publicPath;
      } else if (data.existingProfileImage) {
        profileImage = data.existingProfileImage;
      }
    }

    const sortOrder = await resolveNextSortOrder(
      data.sortOrder,
      String(formData.get("sortOrder") ?? "").trim(),
    );

    await prisma.card.create({
      data: {
        type: data.type,
        title: data.title,
        href: data.href,
        layout: data.type === "ADVANCED" ? data.layout : "MEDIA_LEFT",
        mediaType:
          data.type === "ADVANCED"
            ? "IMAGE"
            : data.mediaType,
        icon:
          data.type === "CLASSIC" && data.mediaType === "ICON" ? data.icon : null,
        image:
          data.type === "ADVANCED" || data.mediaType === "IMAGE" ? image : null,
        badgeText: data.type === "ADVANCED" ? data.badgeText || null : null,
        subtitle: data.type === "ADVANCED" ? data.subtitle || null : null,
        description: data.description || null,
        features:
          data.type === "ADVANCED"
            ? serializeCardFeatures(data.features)
            : null,
        showFrame: data.type === "ADVANCED" ? data.showFrame : true,
        showSparkles: data.type === "ADVANCED" ? data.showSparkles : true,
        videoLabel: data.type === "ADVANCED" ? data.videoLabel || null : null,
        videoUrl: data.type === "ADVANCED" ? data.videoUrl || null : null,
        profileName: data.type === "ADVANCED" ? data.profileName || null : null,
        profileRole: data.type === "ADVANCED" ? data.profileRole || null : null,
        profileImage: data.type === "ADVANCED" ? profileImage : null,
        statValue: data.type === "ADVANCED" ? data.statValue || null : null,
        statLabel: data.type === "ADVANCED" ? data.statLabel || null : null,
        sortOrder,
        isActive: data.isActive,
      },
    });

    revalidatePath("/admin/cards");
    revalidatePath("/");
    return { success: true, message: "Kart oluşturuldu." };
  } catch (error) {
    console.error(error);
    return { error: "Kart eklenirken bir hata oluştu." };
  }
}

export async function updateCardAction(
  _prev: CardFormState,
  formData: FormData,
): Promise<CardFormState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Kart bulunamadı." };

  const data = parseCardPayload(formData);
  const fieldErrors: Record<string, string> = {};

  if (!data.title) fieldErrors.title = "Kart başlığı zorunludur.";

  if (data.type === "CLASSIC") {
    if (!data.href || data.href === "#") {
      fieldErrors.href = "Sayfa linki zorunludur.";
    }
    if (data.mediaType === "ICON" && !data.icon) {
      fieldErrors.icon = "İkon seçin veya görsel tipine geçin.";
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { error: "Lütfen formu kontrol edin.", fieldErrors };
  }

  try {
    const existing = await prisma.card.findUnique({ where: { id } });
    if (!existing) return { error: "Kart bulunamadı." };

    let image = data.existingImage || existing.image || "";
    let profileImage =
      data.existingProfileImage || existing.profileImage || "";

    const needsImage =
      data.type === "ADVANCED" ||
      (data.type === "CLASSIC" && data.mediaType === "IMAGE");

    if (needsImage) {
      if (data.imageFile instanceof File && data.imageFile.size > 0) {
        const saved = await saveOptimizedImage(data.imageFile, {
          uploadDir: "uploads/cards",
          maxBytes: uploadLimits.image,
          mode: "webp",
          quality: 82,
          previousPath: existing.image || undefined,
        });
        image = saved.publicPath;
      } else if (
        data.type === "CLASSIC" &&
        data.mediaType === "IMAGE" &&
        !image
      ) {
        return {
          error: "Görsel tipi için bir görsel yükleyin.",
          fieldErrors: { image: "Görsel zorunlu" },
        };
      }
    } else if (existing.image) {
      await deletePublicAsset(existing.image);
      image = "";
    }

    if (data.type === "ADVANCED") {
      if (
        data.profileImageFile instanceof File &&
        data.profileImageFile.size > 0
      ) {
        const saved = await saveOptimizedImage(data.profileImageFile, {
          uploadDir: "uploads/cards",
          maxBytes: uploadLimits.image,
          mode: "webp",
          quality: 82,
          previousPath: existing.profileImage || undefined,
        });
        profileImage = saved.publicPath;
      }
    } else if (existing.profileImage) {
      await deletePublicAsset(existing.profileImage);
      profileImage = "";
    }

    await prisma.card.update({
      where: { id },
      data: {
        type: data.type,
        title: data.title,
        href: data.href,
        layout: data.type === "ADVANCED" ? data.layout : existing.layout,
        mediaType:
          data.type === "ADVANCED"
            ? "IMAGE"
            : data.mediaType,
        icon:
          data.type === "CLASSIC" && data.mediaType === "ICON" ? data.icon : null,
        image:
          data.type === "ADVANCED" || data.mediaType === "IMAGE"
            ? image || null
            : null,
        badgeText: data.type === "ADVANCED" ? data.badgeText || null : null,
        subtitle: data.type === "ADVANCED" ? data.subtitle || null : null,
        description: data.description || null,
        features:
          data.type === "ADVANCED"
            ? serializeCardFeatures(data.features)
            : null,
        showFrame: data.type === "ADVANCED" ? data.showFrame : true,
        showSparkles: data.type === "ADVANCED" ? data.showSparkles : true,
        videoLabel: data.type === "ADVANCED" ? data.videoLabel || null : null,
        videoUrl: data.type === "ADVANCED" ? data.videoUrl || null : null,
        profileName: data.type === "ADVANCED" ? data.profileName || null : null,
        profileRole: data.type === "ADVANCED" ? data.profileRole || null : null,
        profileImage: data.type === "ADVANCED" ? profileImage || null : null,
        statValue: data.type === "ADVANCED" ? data.statValue || null : null,
        statLabel: data.type === "ADVANCED" ? data.statLabel || null : null,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
      },
    });

    revalidatePath("/admin/cards");
    revalidatePath(`/admin/cards/${id}/edit`);
    revalidatePath("/");
    return { success: true, message: "Kart güncellendi." };
  } catch (error) {
    console.error(error);
    return { error: "Kart güncellenirken bir hata oluştu." };
  }
}

export async function deleteCardAction(
  formData: FormData,
): Promise<DeleteCardResult> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Kart bulunamadı." };

  const existing = await prisma.card.findUnique({ where: { id } });
  if (!existing) return { error: "Kart bulunamadı." };

  await prisma.card.delete({ where: { id } });
  if (existing.image) await deletePublicAsset(existing.image);
  if (existing.profileImage) await deletePublicAsset(existing.profileImage);

  revalidatePath("/admin/cards");
  revalidatePath("/");
  return { success: true, message: "Kart silindi." };
}

export async function toggleCardActiveAction(formData: FormData) {
  try {
    await requireAdmin();
  } catch {
    return;
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const existing = await prisma.card.findUnique({ where: { id } });
  if (!existing) return;

  await prisma.card.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });

  revalidatePath("/admin/cards");
  revalidatePath("/");
}
