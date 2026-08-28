import { mkdir, unlink, access } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import sharp from "sharp";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_FILE_BYTES = 512 * 1024;
const PUBLIC_ROOT = path.join(process.cwd(), "public");

const INPUT_IMAGE_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "image/gif",
  "image/avif",
  "image/x-icon",
  "image/vnd.microsoft.icon",
]);

export type ImageProcessMode = "webp" | "favicon" | "preserve";

export type SavedUpload = {
  publicPath: string;
  absolutePath: string;
  fileName: string;
  mimeType: string;
  companionPaths?: string[];
};

function sanitizeBaseName(name: string) {
  return name
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function toPublicAbsolute(publicPath: string) {
  const normalized = publicPath.replace(/\\/g, "/").split("?")[0].split("#")[0];
  if (!normalized.startsWith("/") || normalized.includes("..")) {
    return null;
  }
  return path.join(PUBLIC_ROOT, normalized.slice(1));
}

function siblingWebpPath(publicPath: string) {
  return publicPath.replace(/\.[^.]+$/, ".webp");
}

function siblingPngPath(publicPath: string) {
  return publicPath.replace(/\.[^.]+$/, ".png");
}

async function fileExists(absolutePath: string) {
  try {
    await access(absolutePath);
    return true;
  } catch {
    return false;
  }
}

export function resolvePublicUploadFile(urlPath: string) {
  const normalized = urlPath.replace(/\\/g, "/").split("?")[0].split("#")[0];
  if (!normalized.startsWith("/uploads/") || normalized.includes("..")) {
    return null;
  }

  const absolutePath = path.resolve(PUBLIC_ROOT, normalized.slice(1));
  if (!isInsidePublicRoot(absolutePath)) {
    return null;
  }

  return absolutePath;
}

export function mimeForUploadPath(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".webp":
      return "image/webp";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".avif":
      return "image/avif";
    case ".svg":
      return "image/svg+xml";
    case ".ico":
      return "image/x-icon";
    case ".json":
    case ".webmanifest":
      return "application/manifest+json";
    default:
      return "application/octet-stream";
  }
}

function isInsidePublicRoot(absolutePath: string) {
  const root = path.resolve(PUBLIC_ROOT);
  const target = path.resolve(absolutePath);

  if (process.platform === "win32") {
    const rootLower = root.toLowerCase();
    const targetLower = target.toLowerCase();
    return targetLower === rootLower || targetLower.startsWith(rootLower + path.sep);
  }

  return target === root || target.startsWith(root + path.sep);
}

/** Safely delete a file under /public (and common companion formats). */
export async function deletePublicAsset(publicPath?: string | null) {
  if (!publicPath || publicPath.startsWith("blob:") || publicPath.startsWith("http")) {
    return false;
  }

  const absolutePath = toPublicAbsolute(publicPath);
  if (!absolutePath || !isInsidePublicRoot(absolutePath)) {
    return false;
  }

  const resolvedFile = path.resolve(absolutePath);
  const baseName = path.basename(resolvedFile);
  if (baseName === ".gitkeep" || baseName === "site.webmanifest") {
    return false;
  }

  const candidates = new Set<string>([resolvedFile]);

  if (/\.(png|jpe?g|webp|gif|avif)$/i.test(resolvedFile)) {
    candidates.add(resolvedFile.replace(/\.[^.]+$/, ".webp"));
    candidates.add(resolvedFile.replace(/\.[^.]+$/, ".png"));
    candidates.add(resolvedFile.replace(/\.[^.]+$/, ".jpg"));
    candidates.add(resolvedFile.replace(/\.[^.]+$/, ".jpeg"));
  }

  let deleted = false;
  for (const candidate of candidates) {
    if (!isInsidePublicRoot(candidate)) continue;
    if (await fileExists(candidate)) {
      await unlink(candidate);
      deleted = true;
    }
  }

  return deleted;
}

export async function savePublicUpload(
  file: File,
  options: {
    uploadDir?: string;
    fixedFileName?: string;
    allowedMime?: string[];
    maxBytes?: number;
    previousPath?: string;
  } = {},
): Promise<SavedUpload> {
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Geçersiz dosya.");
  }

  const maxBytes = options.maxBytes ?? MAX_FILE_BYTES;
  if (file.size > maxBytes) {
    throw new Error(`Dosya boyutu ${(maxBytes / 1024 / 1024).toFixed(1)} MB sınırını aşıyor.`);
  }

  const mime = file.type || "application/octet-stream";
  const lowerName = file.name.toLowerCase();
  if (options.allowedMime?.length) {
    const allowed = options.allowedMime;
    const mimeOk = allowed.includes(mime);
    const extOk = allowed.some((item) => item.startsWith(".") && lowerName.endsWith(item));
    if (!mimeOk && !extOk) {
      throw new Error(`Bu dosya türüne izin verilmiyor: ${mime || file.name}`);
    }
  }

  const relativeDir = (options.uploadDir ?? "").replace(/^\/+|\/+$/g, "");
  const targetDir = path.join(PUBLIC_ROOT, relativeDir);
  await mkdir(targetDir, { recursive: true });

  let fileName = options.fixedFileName;
  if (!fileName) {
    const ext =
      path.extname(file.name).toLowerCase() ||
      (lowerName.endsWith(".webmanifest") ? ".webmanifest" : ".bin");
    const base = sanitizeBaseName(file.name) || "file";
    fileName = `${base}-${randomBytes(4).toString("hex")}${ext}`;
  }

  const absolutePath = path.join(targetDir, fileName);
  const { writeFile } = await import("fs/promises");
  await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));

  const publicPath = `/${[relativeDir, fileName].filter(Boolean).join("/")}`.replace(/\\/g, "/");

  if (options.previousPath && options.previousPath !== publicPath) {
    await deletePublicAsset(options.previousPath);
  }

  return { publicPath, absolutePath, fileName, mimeType: mime };
}

export async function saveOptimizedImage(
  file: File,
  options: {
    uploadDir?: string;
    fixedFileName?: string;
    allowedMime?: string[];
    maxBytes?: number;
    mode?: ImageProcessMode;
    width?: number;
    height?: number;
    /** Varsayılan: cover. Uzun ekran görüntüleri için inside kullanın. */
    fit?: "cover" | "inside" | "contain" | "fill" | "outside";
    quality?: number;
    previousPath?: string;
  } = {},
): Promise<SavedUpload> {
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Geçersiz dosya.");
  }

  const maxBytes = options.maxBytes ?? MAX_IMAGE_BYTES;
  if (file.size > maxBytes) {
    throw new Error(`Dosya boyutu ${(maxBytes / 1024 / 1024).toFixed(1)} MB sınırını aşıyor.`);
  }

  const mime = file.type || "application/octet-stream";
  const lowerName = file.name.toLowerCase();
  const allowed = options.allowedMime ?? [...INPUT_IMAGE_MIME];
  const mimeOk = allowed.includes(mime) || INPUT_IMAGE_MIME.has(mime);
  const extOk = allowed.some((item) => item.startsWith(".") && lowerName.endsWith(item));
  if (!mimeOk && !extOk) {
    throw new Error(`Bu görsel türüne izin verilmiyor: ${mime || file.name}`);
  }

  const mode = options.mode ?? "webp";
  const relativeDir = (options.uploadDir ?? "").replace(/^\/+|\/+$/g, "");
  const targetDir = path.join(PUBLIC_ROOT, relativeDir);
  await mkdir(targetDir, { recursive: true });

  const inputBuffer = Buffer.from(await file.arrayBuffer());

  // SVG logoları vektör kalitesi için olduğu gibi saklanır
  if (mime === "image/svg+xml" || lowerName.endsWith(".svg")) {
    const fileName =
      options.fixedFileName?.replace(/\.[^.]+$/, ".svg") ||
      `${sanitizeBaseName(file.name) || "logo"}-${randomBytes(4).toString("hex")}.svg`;
    const absolutePath = path.join(targetDir, fileName);
    const { writeFile } = await import("fs/promises");
    await writeFile(absolutePath, inputBuffer);

    if (options.previousPath && options.previousPath !== `/${[relativeDir, fileName].filter(Boolean).join("/")}`) {
      await deletePublicAsset(options.previousPath);
    }

    return {
      publicPath: `/${[relativeDir, fileName].filter(Boolean).join("/")}`.replace(/\\/g, "/"),
      absolutePath,
      fileName,
      mimeType: "image/svg+xml",
    };
  }

  const companionPaths: string[] = [];
  let fileName: string;
  let mimeType: string;
  let absolutePath: string;

  if (mode === "favicon") {
    // Tarayıcı / Apple uyumu için PNG + performans için WebP
    const pngName = options.fixedFileName || `icon-${options.width || 32}.png`;
    const webpName = pngName.replace(/\.png$/i, ".webp");
    absolutePath = path.join(targetDir, pngName);

    const base = sharp(inputBuffer, { failOn: "none" }).rotate().resize({
      width: options.width,
      height: options.height,
      fit: "cover",
      position: "centre",
      withoutEnlargement: false,
    });

    await base
      .clone()
      .png({ compressionLevel: 9, adaptiveFiltering: true, palette: true })
      .toFile(absolutePath);

    const webpAbsolute = path.join(targetDir, webpName);
    await base
      .clone()
      .webp({ quality: options.quality ?? 90, effort: 6 })
      .toFile(webpAbsolute);

    fileName = pngName;
    mimeType = "image/png";
    companionPaths.push(`/${[relativeDir, webpName].filter(Boolean).join("/")}`.replace(/\\/g, "/"));
  } else {
    // Logo, OG ve genel görseller → WebP
    const baseName =
      options.fixedFileName?.replace(/\.[^.]+$/, "") ||
      `${sanitizeBaseName(file.name) || "image"}-${randomBytes(4).toString("hex")}`;
    fileName = `${baseName}.webp`;
    absolutePath = path.join(targetDir, fileName);

    let webpPipeline = sharp(inputBuffer, { failOn: "none" }).rotate();

    if (options.width || options.height) {
      webpPipeline = webpPipeline.resize({
        width: options.width,
        height: options.height,
        fit: options.fit ?? "cover",
        position: "centre",
        withoutEnlargement: options.fit === "inside" ? true : false,
      });
    } else {
      webpPipeline = webpPipeline.resize({
        width: 2000,
        height: 2000,
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    await webpPipeline
      .webp({
        quality: options.quality ?? 82,
        alphaQuality: 90,
        effort: 6,
        smartSubsample: true,
      })
      .toFile(absolutePath);

    mimeType = "image/webp";
  }

  const publicPath = `/${[relativeDir, fileName].filter(Boolean).join("/")}`.replace(/\\/g, "/");

  if (options.previousPath && options.previousPath !== publicPath) {
    await deletePublicAsset(options.previousPath);
  }

  return {
    publicPath,
    absolutePath,
    fileName,
    mimeType,
    companionPaths,
  };
}

export async function writeSiteWebManifest(options: {
  name: string;
  shortName?: string;
  description?: string;
  icons: Array<{ src: string; sizes: string; type?: string; purpose?: string }>;
}) {
  const icons = options.icons
    .filter((icon) => Boolean(icon.src))
    .flatMap((icon) => {
      const list = [
        {
          src: icon.src,
          sizes: icon.sizes,
          type: icon.type || "image/png",
          purpose: icon.purpose || "any",
        },
      ];
      if (icon.src.endsWith(".png")) {
        list.push({
          src: siblingWebpPath(icon.src),
          sizes: icon.sizes,
          type: "image/webp",
          purpose: icon.purpose || "any",
        });
      }
      return list;
    });

  const manifest = {
    name: options.name,
    short_name: options.shortName || options.name,
    description: options.description || "",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#405189",
    icons,
  };

  const absolutePath = path.join(PUBLIC_ROOT, "site.webmanifest");
  const { writeFile } = await import("fs/promises");
  await writeFile(absolutePath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return "/site.webmanifest";
}

export function getWebpCompanion(publicPath: string) {
  if (!publicPath || publicPath.endsWith(".webp") || publicPath.endsWith(".svg")) {
    return null;
  }
  return siblingWebpPath(publicPath);
}

export function getPngCompanion(publicPath: string) {
  if (!publicPath || publicPath.endsWith(".png")) {
    return null;
  }
  return siblingPngPath(publicPath);
}

export const uploadLimits = {
  image: MAX_IMAGE_BYTES,
  file: MAX_FILE_BYTES,
};
