import "server-only";

import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import {
  isSafeSupportChatMediaSrc,
  supportChatKindFromFile,
  supportChatMediaKindLabel,
  type SupportChatChannel,
  type SupportChatMediaItem,
  type SupportChatMediaKind,
} from "@/modules/support-chat/kinds";

const GRAPH_VERSION = "v21.0";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "support-chat");
const PUBLIC_PREFIX = "/uploads/support-chat";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_MEDIA_BYTES = 16 * 1024 * 1024;
const IMAGE_MAX_EDGE = 1280;

export type SupportChatOutboundMedia = {
  kind: Exclude<SupportChatMediaKind, "document">;
  mime: string;
  fileName: string;
  buffer: Buffer;
  voiceNote?: boolean;
};

export type SupportChatSavedMedia = SupportChatMediaItem & { buffer: Buffer };

export function supportChatMaxBytesForKind(kind: SupportChatMediaKind) {
  switch (kind) {
    case "image":
      return MAX_IMAGE_BYTES;
    case "video":
    case "audio":
    case "document":
      return MAX_MEDIA_BYTES;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function extFromMime(mime: string, fileName?: string) {
  const fromName = fileName?.split(".").pop()?.toLowerCase() ?? "";
  if (/^[a-z0-9]{1,8}$/.test(fromName)) return fromName;
  switch (mime.split(";")[0].trim().toLowerCase()) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "video/mp4":
      return "mp4";
    case "video/quicktime":
      return "mov";
    case "video/3gpp":
      return "3gp";
    case "audio/mpeg":
      return "mp3";
    case "audio/ogg":
    case "audio/opus":
      return "ogg";
    case "audio/aac":
      return "aac";
    case "audio/mp4":
    case "audio/m4a":
      return "m4a";
    case "audio/amr":
      return "amr";
    case "audio/wav":
    case "audio/x-wav":
      return "wav";
    case "audio/webm":
      return "webm";
    case "application/pdf":
      return "pdf";
    default:
      return "bin";
  }
}

function sanitizeFileName(name: string) {
  return name.replace(/[/\\?%*:|"<>]/g, "_").replace(/\s+/g, " ").trim().slice(0, 120);
}

export function toSupportChatMediaItem(saved: SupportChatSavedMedia): SupportChatMediaItem {
  return {
    kind: saved.kind,
    mime: saved.mime,
    fileName: saved.fileName,
    src: saved.src,
  };
}

function pipeline(buffer: Buffer) {
  return sharp(buffer, { failOn: "none" }).rotate().toColourspace("srgb").resize({
    width: IMAGE_MAX_EDGE,
    height: IMAGE_MAX_EDGE,
    fit: "inside",
    withoutEnlargement: true,
  });
}

async function compressSupportChatImage(
  buffer: Buffer,
  mime: string,
): Promise<{ buffer: Buffer; mime: string }> {
  const base = mime.split(";")[0].trim().toLowerCase();
  if (!base.startsWith("image/") || base === "image/svg+xml") return { buffer, mime: base || mime };
  try {
    const meta = await sharp(buffer, { failOn: "none", animated: true }).metadata();
    if ((meta.pages ?? 1) > 1) return { buffer, mime: base || mime };

    const webp = await pipeline(buffer)
      .webp({ quality: 70, alphaQuality: 70, effort: 5, smartSubsample: true })
      .toBuffer();
    const jpeg = await pipeline(buffer)
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 72, mozjpeg: true, progressive: true })
      .toBuffer();

    const candidates: Array<{ buffer: Buffer; mime: string }> = [
      { buffer: webp, mime: "image/webp" },
      { buffer: jpeg, mime: "image/jpeg" },
      { buffer, mime: base || mime },
    ];
    candidates.sort((a, b) => a.buffer.length - b.buffer.length);
    return candidates[0] ?? { buffer, mime: base || mime };
  } catch {
    return { buffer, mime: base || mime };
  }
}

async function imageToJpeg(buffer: Buffer): Promise<Buffer> {
  return pipeline(buffer)
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 72, mozjpeg: true, progressive: true })
    .toBuffer();
}

export async function prepareSupportChatGraphMedia(
  media: SupportChatOutboundMedia,
  channel: SupportChatChannel,
): Promise<SupportChatOutboundMedia> {
  if (media.kind !== "image") return media;
  const jpegOk = media.mime === "image/jpeg" || media.mime === "image/png";
  switch (channel) {
    case "WHATSAPP":
    case "INSTAGRAM_DM":
    case "INSTAGRAM_POST": {
      if (jpegOk) return media;
      try {
        const jpeg = await imageToJpeg(media.buffer);
        return {
          ...media,
          buffer: jpeg,
          mime: "image/jpeg",
          fileName: media.fileName.replace(/\.[^.]+$/, ".jpg"),
        };
      } catch {
        return media;
      }
    }
    case "FACEBOOK_MESSENGER":
    case "FACEBOOK_POST":
    case "TELEGRAM":
    case "TIKTOK":
    case "WEB":
      return media;
    default: {
      const _exhaustive: never = channel;
      return _exhaustive;
    }
  }
}

export async function saveSupportChatMediaFile(input: {
  buffer: Buffer;
  mime: string;
  fileName?: string;
  kind?: SupportChatMediaKind;
}): Promise<SupportChatSavedMedia | { error: string }> {
  const mime = input.mime.split(";")[0].trim().toLowerCase() || "application/octet-stream";
  const kind = input.kind ?? supportChatKindFromFile(mime, input.fileName);
  const max = supportChatMaxBytesForKind(kind);
  if (input.buffer.length < 1) return { error: "Dosya boş." };
  if (input.buffer.length > max) {
    return { error: `${supportChatMediaKindLabel(kind)} en fazla ${Math.round(max / 1024 / 1024)} MB olabilir.` };
  }
  const compressed =
    kind === "image" ? await compressSupportChatImage(input.buffer, mime) : { buffer: input.buffer, mime };
  if (compressed.buffer.length < 1) return { error: "Dosya boş." };
  await mkdir(UPLOAD_DIR, { recursive: true });
  const storedName = `${crypto.randomUUID()}.${extFromMime(compressed.mime, input.fileName)}`;
  await writeFile(path.join(UPLOAD_DIR, storedName), compressed.buffer);
  const originalName = sanitizeFileName(input.fileName || storedName) || storedName;
  const fileName =
    kind === "image" ? originalName.replace(/\.[^.]+$/, "") + `.${extFromMime(compressed.mime)}` : originalName;
  return {
    kind,
    mime: compressed.mime,
    fileName,
    src: `${PUBLIC_PREFIX}/${storedName}`,
    buffer: compressed.buffer,
  };
}

export async function deleteSupportChatUploadedFiles(srcs: string[]) {
  const unique = [...new Set(srcs.filter((src) => isSafeSupportChatMediaSrc(src)))];
  await Promise.all(
    unique.map(async (src) => {
      const storedName = path.basename(src);
      if (!storedName || storedName !== src.slice(PUBLIC_PREFIX.length + 1)) return;
      try {
        await unlink(path.join(UPLOAD_DIR, storedName));
      } catch {
        /* already removed */
      }
    }),
  );
}

async function fetchBinary(url: string, token?: string) {
  const host = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return "";
    }
  })();
  const facebookHost =
    host.includes("fbcdn.net") ||
    host.includes("facebook.com") ||
    host.includes("instagram.com") ||
    host.includes("cdninstagram.com");
  const headers: Record<string, string> = {
    "User-Agent": facebookHost
      ? "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      : "Eticaret-SupportChat/1.0",
  };
  if (facebookHost) headers.Accept = "image/avif,image/webp,image/apng,image/*,*/*;q=0.8";
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(url, {
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) return null;
  const buffer = Buffer.from(await response.arrayBuffer());
  const responseMime = (response.headers.get("content-type") || "").split(";")[0].trim();
  return { buffer, mime: responseMime };
}

export async function downloadWhatsAppGraphMedia(input: {
  mediaId: string;
  tokens: string[];
  mime?: string;
  fileName?: string;
  kind?: SupportChatMediaKind;
}): Promise<SupportChatMediaItem | null> {
  const mediaId = input.mediaId.trim();
  if (!mediaId) return null;
  for (const token of input.tokens.filter(Boolean)) {
    try {
      const metaUrl = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${mediaId}`);
      const metaRes = await fetch(metaUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "Eticaret-SupportChat/1.0",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      const meta = (await metaRes.json()) as { url?: string; mime_type?: string };
      if (!meta.url) continue;
      const file = await fetchBinary(meta.url, token);
      if (!file) continue;
      const saved = await saveSupportChatMediaFile({
        buffer: file.buffer,
        mime: input.mime || meta.mime_type || file.mime || "application/octet-stream",
        fileName: input.fileName,
        kind: input.kind,
      });
      if ("error" in saved) continue;
      return toSupportChatMediaItem(saved);
    } catch {
      continue;
    }
  }
  return null;
}

export async function downloadRemoteMediaUrl(input: {
  url: string;
  tokens?: string[];
  mime?: string;
  fileName?: string;
  kind?: SupportChatMediaKind;
}): Promise<SupportChatMediaItem | null> {
  const url = input.url.trim();
  if (!url.startsWith("https://") && !url.startsWith("http://")) return null;
  const attempts = [undefined, ...(input.tokens ?? []).filter(Boolean)];
  for (const token of attempts) {
    try {
      const file = await fetchBinary(url, token);
      if (!file) continue;
      const saved = await saveSupportChatMediaFile({
        buffer: file.buffer,
        mime: input.mime || file.mime || "application/octet-stream",
        fileName: input.fileName,
        kind: input.kind,
      });
      if ("error" in saved) continue;
      return toSupportChatMediaItem(saved);
    } catch {
      continue;
    }
  }
  return null;
}

export function isSupportChatSendableKind(
  kind: SupportChatMediaKind,
): kind is SupportChatOutboundMedia["kind"] {
  return kind === "image" || kind === "video" || kind === "audio";
}
