import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  deletePublicAsset,
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

const EDITOR_UPLOAD_PREFIX = "/uploads/editor/";

function normalizeEditorUploadPath(input: unknown): string | null {
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

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

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

    const saved = await saveOptimizedImage(file, {
      uploadDir: "uploads/editor",
      maxBytes: uploadLimits.image,
      mode: "webp",
      quality: 82,
    });

    return NextResponse.json({
      url: saved.publicPath,
      fileName: saved.fileName,
    });
  } catch (error) {
    console.error("Editor image upload failed:", error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Görsel yüklenirken bir hata oluştu.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => null)) as { url?: string } | null;
    const path = normalizeEditorUploadPath(body?.url);

    if (!path) {
      return NextResponse.json(
        { error: "Yalnızca editör yüklemeleri silinebilir." },
        { status: 400 },
      );
    }

    const deleted = await deletePublicAsset(path);
    return NextResponse.json({ success: true, deleted, url: path });
  } catch (error) {
    console.error("Editor image delete failed:", error);
    return NextResponse.json({ error: "Görsel silinirken bir hata oluştu." }, { status: 500 });
  }
}
