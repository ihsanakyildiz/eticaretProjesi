import "server-only";

import { randomBytes } from "crypto";
import { lookup } from "dns/promises";
import { access, mkdir, unlink, writeFile } from "fs/promises";
import { isIP } from "net";
import path from "path";
import { yieldToEventLoop } from "@/lib/background-yield";
import type { ProductImportDraft } from "@/lib/product-import";

const FETCH_TIMEOUT_MS = 10000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMPORT_IMAGE_DIR = "uploads/products/catalog";
const IMPORT_IMAGE_CONCURRENCY = 3;

export type ImportImageCache = {
  saved: Map<string, string>;
  failed: Map<string, string>;
  inflight: Map<string, Promise<string>>;
};

export function createImportImageCache(): ImportImageCache {
  return {
    saved: new Map(),
    failed: new Map(),
    inflight: new Map(),
  };
}

async function runPool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  if (items.length === 0) return;
  let cursor = 0;
  async function next() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await worker(items[index]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => next()),
  );
}

function isBlockedIp(address: string) {
  const value = address.trim().toLowerCase();
  const mapped = value.startsWith("::ffff:") ? value.slice(7) : value;
  if (mapped === "127.0.0.1" || mapped === "::1" || mapped === "0.0.0.0" || mapped === "localhost") {
    return true;
  }
  if (mapped.startsWith("10.")) return true;
  if (mapped.startsWith("192.168.")) return true;
  if (mapped.startsWith("169.254.")) return true;
  const match172 = mapped.match(/^172\.(\d+)\./);
  if (match172) {
    const octet = Number(match172[1]);
    if (octet >= 16 && octet <= 31) return true;
  }
  if (mapped.startsWith("fc") || mapped.startsWith("fd") || mapped.startsWith("fe80")) return true;
  return false;
}

async function assertPublicHttpUrl(raw: string) {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("Görsel adresi geçersiz.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Görsel adresi http(s) olmalıdır.");
  }
  const host = parsed.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || isBlockedIp(host)) {
    throw new Error("Yerel veya özel ağ adresi kullanılamaz.");
  }
  if (isIP(host)) {
    if (isBlockedIp(host)) throw new Error("Yerel veya özel ağ adresi kullanılamaz.");
    return parsed;
  }
  const resolved = await lookup(host, { all: true });
  if (resolved.length === 0 || resolved.some((item) => isBlockedIp(item.address))) {
    throw new Error("Görsel adresi çözümlenemedi veya özel ağa işaret ediyor.");
  }
  return parsed;
}

function sniffImageExt(buffer: Buffer) {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return "jpg";
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return "png";
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return "gif";
  if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
    return "webp";
  }
  if (buffer.toString("ascii", 4, 8) === "ftyp") return "avif";
  return null;
}

async function ensureLocalUpload(url: string) {
  // sharp instrumentation paketini kırmamak için uploads yalnızca burada yüklenir.
  const { resolvePublicUploadFile } = await import("@/lib/uploads");
  const absolute = resolvePublicUploadFile(url);
  if (!absolute) throw new Error("Yerel görsel yolu geçersiz.");
  await access(absolute);
  return url.split("?")[0].split("#")[0];
}

async function downloadRemoteImage(url: string) {
  const parsed = await assertPublicHttpUrl(url);
  const response = await fetch(parsed.href, {
    method: "GET",
    redirect: "follow",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: {
      Accept: "image/jpeg,image/png,image/webp,image/*,*/*;q=0.8",
    },
  });
  if (!response.ok) {
    throw new Error(`Uzak görsel bulunamadı (${response.status}).`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength === 0) throw new Error("Uzak görsel boş.");
  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("Görsel 5 MB sınırını aşıyor.");
  }

  const ext = sniffImageExt(buffer);
  if (!ext) throw new Error("Adres bir görsel dosyası değil.");

  const dir = path.join(process.cwd(), "public", IMPORT_IMAGE_DIR);
  await mkdir(dir, { recursive: true });
  const fileName = `import-${randomBytes(6).toString("hex")}.webp`;
  const absolute = path.join(dir, fileName);
  try {
    const sharp = (await import("sharp")).default;
    await sharp(buffer, { failOn: "none", unlimited: true })
      .rotate()
      .toColourspace("srgb")
      .resize({
        width: 2000,
        height: 2000,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 80, effort: 4, smartSubsample: true })
      .toFile(absolute);
  } catch {
    await unlink(absolute).catch(() => undefined);
    const fallbackName = `import-${randomBytes(6).toString("hex")}.${ext}`;
    await writeFile(path.join(dir, fallbackName), buffer);
    return `/${IMPORT_IMAGE_DIR}/${fallbackName}`.replace(/\\/g, "/");
  }
  return `/${IMPORT_IMAGE_DIR}/${fileName}`.replace(/\\/g, "/");
}

export async function localizeImportImageUrl(url: string, cache: ImportImageCache) {
  const key = url.trim();
  const cached = cache.saved.get(key);
  if (cached) return cached;
  const previousError = cache.failed.get(key);
  if (previousError) throw new Error(previousError);
  const pending = cache.inflight.get(key);
  if (pending) return pending;

  const work = (async () => {
    try {
      const local = key.startsWith("/uploads/")
        ? await ensureLocalUpload(key)
        : await downloadRemoteImage(key);
      cache.saved.set(key, local);
      return local;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Görsel indirilemedi.";
      cache.failed.set(key, message);
      throw new Error(message);
    } finally {
      cache.inflight.delete(key);
    }
  })();
  cache.inflight.set(key, work);
  return work;
}

function applyLocalizedImages(
  draft: ProductImportDraft,
  cache: ImportImageCache,
  keepOnFailure = false,
): { draft: ProductImportDraft } | { error: string } {
  try {
    const localized: string[] = [];
    for (const url of draft.imageUrls) {
      const key = url.trim();
      const saved = cache.saved.get(key);
      if (saved) {
        localized.push(saved);
        continue;
      }
      if (keepOnFailure) continue;
      throw new Error(cache.failed.get(key) || "Görsel indirilemedi.");
    }
    const variants = draft.variants.map((variant) => {
      if (!variant.imageUrl) return variant;
      const key = variant.imageUrl.trim();
      const saved = cache.saved.get(key);
      if (saved) return { ...variant, imageUrl: saved };
      if (keepOnFailure) return { ...variant, imageUrl: null };
      throw new Error(cache.failed.get(key) || "Görsel indirilemedi.");
    });
    return {
      draft: {
        ...draft,
        imageUrls: localized,
        variants,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Görsel indirilemedi.";
    return { error: `Görsel indirilemedi: ${message}` };
  }
}

export async function localizeImportedProductImages(
  draft: ProductImportDraft,
  cache: ImportImageCache,
): Promise<{ draft: ProductImportDraft } | { error: string }> {
  const results = await localizeImportedProductImagesBatch([draft], cache);
  return results[0];
}

export async function localizeImportedProductImagesBatch(
  drafts: ProductImportDraft[],
  cache: ImportImageCache,
  options?: { keepOnFailure?: boolean; concurrency?: number },
): Promise<Array<{ draft: ProductImportDraft } | { error: string }>> {
  const urls = new Set<string>();
  for (const draft of drafts) {
    for (const url of draft.imageUrls) urls.add(url.trim());
    for (const variant of draft.variants) {
      if (variant.imageUrl) urls.add(variant.imageUrl.trim());
    }
  }
  const concurrency = Math.max(1, Math.min(6, options?.concurrency ?? IMPORT_IMAGE_CONCURRENCY));
  await runPool([...urls], concurrency, async (url) => {
    try {
      await localizeImportImageUrl(url, cache);
    } catch {
      /* cache.failed doldurulur; ürün sonra atlanır veya görselsiz devam eder */
    }
    await yieldToEventLoop();
  });
  return drafts.map((draft) => applyLocalizedImages(draft, cache, options?.keepOnFailure === true));
}
