import { revalidatePath, revalidateTag } from "next/cache";
import { rm, access } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";

export type CacheActionMode = "refresh" | "purge";

export type CacheActionResult = {
  success: boolean;
  message: string;
  clearedAt?: string;
  details?: string[];
};

const REVALIDATE_PATHS: Array<{ path: string; type?: "page" | "layout" }> = [
  { path: "/", type: "layout" },
  { path: "/admin", type: "layout" },
  { path: "/admin/settings", type: "layout" },
  { path: "/admin/settings/performance", type: "page" },
  { path: "/admin/login", type: "page" },
];

const CACHE_TAGS = ["site", "settings", "pages", "blog", "projects", "works"] as const;

async function pathExists(target: string) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function clearNextBuildCache() {
  const details: string[] = [];
  const targets = [
    path.join(process.cwd(), ".next", "cache"),
    path.join(process.cwd(), ".next", "server", "app"),
  ];

  for (const target of targets) {
    if (!(await pathExists(target))) {
      continue;
    }

    // Sadece .next/cache klasörünü tamamen silmek güvenli;
    // server/app silmek dev sunucusunu bozabilir — sadece fetch-cache benzeri altları temizle
    if (target.endsWith(`${path.sep}cache`) || target.endsWith("/cache")) {
      await rm(target, { recursive: true, force: true });
      details.push(`.next/cache temizlendi`);
    }
  }

  // Next.js fetch data cache (varsa)
  const fetchCache = path.join(process.cwd(), ".next", "cache", "fetch-cache");
  if (await pathExists(fetchCache)) {
    await rm(fetchCache, { recursive: true, force: true });
    details.push("fetch-cache temizlendi");
  }

  return details;
}

async function rememberCacheCleared(mode: CacheActionMode) {
  const clearedAt = new Date().toISOString();
  const value = JSON.stringify({ mode, clearedAt });

  await prisma.setting.upsert({
    where: { key: "perf_cache_last_cleared" },
    update: {
      value,
      label: "Son Önbellek Temizliği",
      type: "text",
      group: "perf_cache",
      sortOrder: 99,
    },
    create: {
      key: "perf_cache_last_cleared",
      value,
      label: "Son Önbellek Temizliği",
      type: "text",
      group: "perf_cache",
      sortOrder: 99,
    },
  });

  return clearedAt;
}

export async function runCacheAction(mode: CacheActionMode): Promise<CacheActionResult> {
  const details: string[] = [];

  for (const item of REVALIDATE_PATHS) {
    revalidatePath(item.path, item.type);
    details.push(`Yenilendi: ${item.path}`);
  }

  for (const tag of CACHE_TAGS) {
    try {
      revalidateTag(tag);
      details.push(`Tag: ${tag}`);
    } catch {
      // tag henüz kullanılmıyor olabilir
    }
  }

  if (mode === "purge") {
    const cleared = await clearNextBuildCache();
    details.push(...cleared);
    if (cleared.length === 0) {
      details.push("Disk önbelleği zaten boş veya bulunamadı");
    }
  }

  const clearedAt = await rememberCacheCleared(mode);

  revalidatePath("/admin/settings/performance");
  revalidatePath("/");

  return {
    success: true,
    clearedAt,
    details,
    message:
      mode === "purge"
        ? "Önbellek tamamen temizlendi ve sayfalar yenilendi."
        : "Site önbelleği yenilendi (revalidate).",
  };
}

export function parseLastCacheCleared(raw?: string) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { mode?: CacheActionMode; clearedAt?: string };
    if (!parsed.clearedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}
