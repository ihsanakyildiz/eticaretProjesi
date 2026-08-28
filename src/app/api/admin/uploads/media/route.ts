import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  saveOptimizedImage,
  uploadLimits,
} from "@/lib/uploads";

export const runtime = "nodejs";

const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

/** Form alanı `folder` için izin verilen alt klasörler */
const ALLOWED_FOLDERS = new Set([
  "uploads/projects",
  "uploads/projects/gallery",
  "uploads/works",
  "uploads/blog",
  "uploads/blog/categories",
  "uploads/works/categories",
  "uploads/projects/categories",
  "uploads/pages",
  "uploads/cards",
  "uploads/heroes",
  "uploads/avatars",
]);

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const folderRaw = String(formData.get("folder") ?? "").trim();

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Görsel dosyası gerekli." }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Yalnızca PNG, JPG, WEBP veya GIF yüklenebilir." },
        { status: 400 },
      );
    }

    if (file.size > uploadLimits.image) {
      return NextResponse.json(
        { error: "Görsel boyutu en fazla 5 MB olabilir." },
        { status: 400 },
      );
    }

    if (!ALLOWED_FOLDERS.has(folderRaw)) {
      return NextResponse.json({ error: "Geçersiz yükleme klasörü." }, { status: 400 });
    }

    const saved = await saveOptimizedImage(file, {
      uploadDir: folderRaw,
      maxBytes: uploadLimits.image,
      mode: "webp",
      quality: 82,
    });

    return NextResponse.json({
      url: saved.publicPath,
      fileName: saved.fileName,
    });
  } catch (error) {
    console.error("Admin media upload failed:", error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Görsel yüklenirken bir hata oluştu.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
