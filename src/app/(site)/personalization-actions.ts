"use server";

import { saveOptimizedImage, uploadLimits } from "@/lib/uploads";

export type PersonalizationUploadState = {
  ok?: boolean;
  url?: string;
  error?: string;
};

export async function uploadPersonalizationImageAction(
  formData: FormData,
): Promise<PersonalizationUploadState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Görsel seçin." };
  }

  try {
    const saved = await saveOptimizedImage(file, {
      uploadDir: "uploads/personalization",
      maxBytes: uploadLimits.image,
      mode: "webp",
      width: 1600,
      height: 1600,
      fit: "inside",
      quality: 82,
    });
    return { ok: true, url: saved.publicPath };
  } catch (error) {
    console.error(error);
    return {
      error: error instanceof Error ? error.message : "Görsel yüklenemedi.",
    };
  }
}
