"use client";

export async function uploadAdminMedia(
  file: File,
  folder: string,
): Promise<{ url: string; fileName: string }> {
  const formData = new FormData();
  formData.set("file", file);
  formData.set("folder", folder);

  const response = await fetch("/api/admin/uploads/media", {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json().catch(() => null)) as {
    url?: string;
    fileName?: string;
    error?: string;
  } | null;

  if (!response.ok || !payload?.url) {
    throw new Error(payload?.error || "Görsel yüklenemedi.");
  }

  return {
    url: payload.url,
    fileName: payload.fileName || file.name,
  };
}
