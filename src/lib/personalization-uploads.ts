import "server-only";

import { readdir, stat } from "fs/promises";
import path from "path";
import { randomBytes } from "node:crypto";
import { ensureProductPersonalizationSchema } from "@/lib/ensure-product-personalization-schema";
import { prisma } from "@/lib/prisma";
import {
  formatPersonalizationSummary,
  normalizePersonalization,
  parseStoredPersonalization,
} from "@/lib/product-personalization";
import { deletePublicAsset } from "@/lib/uploads";

export const PERSONALIZATION_UPLOAD_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PERSONALIZATION_DIR = path.join(process.cwd(), "public", "uploads", "personalization");
const PUBLIC_PREFIX = "/uploads/personalization/";
const THUMB_PREFIX = "/uploads/personalization/thumbs/";

function newId() {
  return randomBytes(12).toString("hex");
}

function isTrackedPersonalizationPath(publicPath: string) {
  return (
    publicPath.startsWith(PUBLIC_PREFIX) &&
    !publicPath.startsWith(THUMB_PREFIX) &&
    !publicPath.includes("..") &&
    !publicPath.includes("\\")
  );
}

function isThumbPath(publicPath: string) {
  return (
    publicPath.startsWith(THUMB_PREFIX) &&
    !publicPath.includes("..") &&
    !publicPath.includes("\\")
  );
}

export async function recordPersonalizationUpload(
  publicPath: string,
  thumbPath?: string | null,
) {
  const normalized = publicPath.trim().slice(0, 500);
  if (!isTrackedPersonalizationPath(normalized)) return;
  const thumb = thumbPath?.trim().slice(0, 500) || null;
  if (thumb && !isThumbPath(thumb)) return;

  await ensureProductPersonalizationSchema();
  await prisma.$executeRaw`
    INSERT INTO personalization_uploads (id, publicPath, thumbPath, createdAt)
    VALUES (${newId()}, ${normalized}, ${thumb}, NOW(3))
    ON DUPLICATE KEY UPDATE
      thumbPath = COALESCE(VALUES(thumbPath), thumbPath)
  `;
}

export async function claimPersonalizationUploads(
  publicPaths: string[],
  orderId?: string | null,
) {
  const unique = [
    ...new Set(
      publicPaths
        .map((item) => item.trim().slice(0, 500))
        .filter((item) => isTrackedPersonalizationPath(item)),
    ),
  ];
  if (unique.length === 0) return;

  await ensureProductPersonalizationSchema();
  for (const publicPath of unique) {
    await prisma.$executeRaw`
      UPDATE personalization_uploads
      SET
        claimedAt = COALESCE(claimedAt, NOW(3)),
        orderId = COALESCE(orderId, ${orderId ?? null})
      WHERE publicPath = ${publicPath}
    `;
  }
}

async function isReferencedByOrder(publicPath: string) {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM order_items
    WHERE personalizationJson LIKE ${`%${publicPath}%`}
    LIMIT 1
  `.catch(() => []);
  return rows.length > 0;
}

async function deleteTrackedUpload(
  id: string,
  publicPath: string,
  thumbPath?: string | null,
) {
  await deletePublicAsset(publicPath);
  if (thumbPath) await deletePublicAsset(thumbPath);
  await prisma.$executeRaw`
    DELETE FROM personalization_uploads WHERE id = ${id}
  `;
}

function rewritePersonalizationJsonAfterOriginalPurge(
  raw: string | null | undefined,
  originalToThumb: Map<string, string>,
) {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as {
      values?: unknown;
      summary?: unknown;
    };
    const personalization = normalizePersonalization(parsed);
    if (!personalization) return text;

    let changed = false;
    const values = personalization.values.map((item) => {
      if (item.kind !== "IMAGE" || !item.imageUrl) return item;
      const thumb =
        originalToThumb.get(item.imageUrl) ||
        item.imageThumbUrl ||
        null;
      if (!thumb) return { ...item, originalPurged: true };
      if (item.imageUrl === thumb && item.originalPurged) return item;
      changed = true;
      return {
        ...item,
        imageUrl: thumb,
        imageThumbUrl: thumb,
        originalPurged: true,
      };
    });

    if (!changed && !values.some((item) => item.originalPurged)) return text;

    const next = { values, summary: formatPersonalizationSummary({ values }) };
    return JSON.stringify(next);
  } catch {
    return text;
  }
}

/** Teslim edilen siparişte baskı orijinallerini siler; thumb kalır */
export async function purgePersonalizationOriginalsForOrder(orderId: string) {
  const id = orderId.trim();
  if (!id) return { purged: 0 };

  await ensureProductPersonalizationSchema();

  const rows = await prisma.$queryRaw<
    Array<{ id: string; publicPath: string; thumbPath: string | null }>
  >`
    SELECT id, publicPath, thumbPath
    FROM personalization_uploads
    WHERE orderId = ${id}
      AND originalPurgedAt IS NULL
  `.catch(() => []);

  const originalToThumb = new Map<string, string>();
  let purged = 0;

  for (const row of rows) {
    const thumb = row.thumbPath?.trim() || null;
    if (thumb) originalToThumb.set(row.publicPath, thumb);
    await deletePublicAsset(row.publicPath);
    await prisma.$executeRaw`
      UPDATE personalization_uploads
      SET originalPurgedAt = NOW(3)
      WHERE id = ${row.id}
    `;
    purged += 1;
  }

  // JSON içindeki orijinal yolları (kayıt eksikse) thumb ile değiştir
  const items = await prisma.$queryRaw<
    Array<{ id: string; personalizationJson: string | null }>
  >`
    SELECT id, personalizationJson
    FROM order_items
    WHERE orderId = ${id}
      AND personalizationJson IS NOT NULL
  `.catch(() => []);

  for (const item of items) {
    const personalization = parseStoredPersonalization(item.personalizationJson);
    if (!personalization) continue;

    // JSON'daki orijinallerden thumb eşlemesi tamamla
    for (const value of personalization.values) {
      if (value.kind !== "IMAGE" || !value.imageUrl) continue;
      if (originalToThumb.has(value.imageUrl)) continue;
      if (value.imageThumbUrl && isThumbPath(value.imageThumbUrl)) {
        originalToThumb.set(value.imageUrl, value.imageThumbUrl);
        if (isTrackedPersonalizationPath(value.imageUrl)) {
          await deletePublicAsset(value.imageUrl);
          await prisma.$executeRaw`
            UPDATE personalization_uploads
            SET originalPurgedAt = COALESCE(originalPurgedAt, NOW(3))
            WHERE publicPath = ${value.imageUrl}
          `.catch(() => undefined);
          purged += 1;
        }
      }
    }

    const nextJson = rewritePersonalizationJsonAfterOriginalPurge(
      item.personalizationJson,
      originalToThumb,
    );
    if (nextJson && nextJson !== item.personalizationJson) {
      await prisma.$executeRaw`
        UPDATE order_items
        SET personalizationJson = ${nextJson}
        WHERE id = ${item.id}
      `;
    }
  }

  return { purged };
}

/** DELIVERED siparişlerde bekleyen orijinalleri temizler (cron / güvenlik ağı) */
export async function purgePersonalizationOriginalsForDeliveredOrders() {
  await ensureProductPersonalizationSchema();
  const rows = await prisma.$queryRaw<Array<{ orderId: string }>>`
    SELECT DISTINCT u.orderId AS orderId
    FROM personalization_uploads u
    INNER JOIN orders o ON o.id = u.orderId
    WHERE u.orderId IS NOT NULL
      AND u.originalPurgedAt IS NULL
      AND u.claimedAt IS NOT NULL
      AND o.status = 'DELIVERED'
    LIMIT 100
  `.catch(() => []);

  let purged = 0;
  for (const row of rows) {
    if (!row.orderId) continue;
    const result = await purgePersonalizationOriginalsForOrder(row.orderId);
    purged += result.purged;
  }
  return { purged, orders: rows.length };
}

/** Siparişe bağlanmayan kişiye özel görselleri 7 günden sonra siler */
export async function purgeExpiredPersonalizationUploads(now = new Date()) {
  await ensureProductPersonalizationSchema();
  const cutoff = new Date(now.getTime() - PERSONALIZATION_UPLOAD_TTL_MS);
  let deleted = 0;
  let claimedLate = 0;

  const expired = await prisma.$queryRaw<
    Array<{ id: string; publicPath: string; thumbPath: string | null }>
  >`
    SELECT id, publicPath, thumbPath
    FROM personalization_uploads
    WHERE claimedAt IS NULL
      AND createdAt < ${cutoff}
    ORDER BY createdAt ASC
    LIMIT 500
  `.catch(() => []);

  for (const row of expired) {
    if (await isReferencedByOrder(row.publicPath)) {
      await claimPersonalizationUploads([row.publicPath]);
      claimedLate += 1;
      continue;
    }
    await deleteTrackedUpload(row.id, row.publicPath, row.thumbPath);
    deleted += 1;
  }

  let orphanDeleted = 0;
  try {
    const names = await readdir(PERSONALIZATION_DIR);
    for (const name of names) {
      if (name === ".gitkeep" || name === "thumbs") continue;
      const absolute = path.join(PERSONALIZATION_DIR, name);
      const info = await stat(absolute).catch(() => null);
      if (!info?.isFile() || info.mtimeMs >= cutoff.getTime()) continue;

      const publicPath = `${PUBLIC_PREFIX}${name}`;
      const tracked = await prisma.$queryRaw<
        Array<{
          id: string;
          claimedAt: Date | null;
          thumbPath: string | null;
          originalPurgedAt: Date | null;
        }>
      >`
        SELECT id, claimedAt, thumbPath, originalPurgedAt
        FROM personalization_uploads
        WHERE publicPath = ${publicPath}
        LIMIT 1
      `.catch(() => []);

      if (tracked[0]?.claimedAt) continue;
      if (await isReferencedByOrder(publicPath)) {
        await claimPersonalizationUploads([publicPath]);
        claimedLate += 1;
        continue;
      }

      await deletePublicAsset(publicPath);
      if (tracked[0]?.thumbPath) await deletePublicAsset(tracked[0].thumbPath);
      if (tracked[0]?.id) {
        await prisma.$executeRaw`
          DELETE FROM personalization_uploads WHERE id = ${tracked[0].id}
        `;
      }
      orphanDeleted += 1;
    }
  } catch {
    // klasör henüz yoksa sorun değil
  }

  const delivered = await purgePersonalizationOriginalsForDeliveredOrders().catch(() => ({
    purged: 0,
    orders: 0,
  }));

  return {
    deleted,
    orphanDeleted,
    claimedLate,
    deliveredOriginalsPurged: delivered.purged,
    deliveredOrders: delivered.orders,
  };
}
