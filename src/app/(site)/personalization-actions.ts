"use server";

import { recordPersonalizationUpload } from "@/lib/personalization-uploads";
import { saveOptimizedImage, savePublicUpload, uploadLimits } from "@/lib/uploads";

export type PersonalizationUploadState = {
  ok?: boolean;
  url?: string;
  thumbUrl?: string;
  error?: string;
};

/** Baskı için orijinal dosya; yeniden boyutlandırma / WebP dönüşümü yok */
const PERSONALIZATION_IMAGE_MIME = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/tiff",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".tif",
  ".tiff",
];

export async function uploadPersonalizationImageAction(
  formData: FormData,
): Promise<PersonalizationUploadState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Görsel seçin." };
  }

  try {
    const saved = await savePublicUpload(file, {
      uploadDir: "uploads/personalization",
      maxBytes: uploadLimits.personalization,
      allowedMime: PERSONALIZATION_IMAGE_MIME,
    });

    let thumbUrl: string | undefined;
    try {
      const thumb = await saveOptimizedImage(file, {
        uploadDir: "uploads/personalization/thumbs",
        maxBytes: uploadLimits.personalization,
        mode: "webp",
        width: 320,
        height: 320,
        fit: "inside",
        quality: 78,
      });
      thumbUrl = thumb.publicPath;
    } catch (thumbError) {
      console.error(thumbError);
    }

    await recordPersonalizationUpload(saved.publicPath, thumbUrl).catch(() => undefined);
    return { ok: true, url: saved.publicPath, thumbUrl };
  } catch (error) {
    console.error(error);
    return {
      error: error instanceof Error ? error.message : "Görsel yüklenemedi.",
    };
  }
}
