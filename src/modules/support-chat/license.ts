import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import {
  SUPPORT_CHAT_MODULE_ID,
  type SupportChatLicenseState,
} from "@/modules/support-chat/kinds";

export type { SupportChatLicenseState };

type LicensePayload = {
  module: string;
  exp?: string;
};

function licenseSecret() {
  return process.env.MODULE_LICENSE_SECRET || process.env.AUTH_SECRET || "";
}

function signBody(body: string, secret: string) {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function parseSupportChatLicenseKey(raw: string): LicensePayload | null {
  const secret = licenseSecret();
  if (!secret) return null;
  const parts = raw.trim().split(".");
  if (parts.length !== 3 || parts[0] !== "IA-SCHAT") return null;
  const body = parts[1] ?? "";
  const sig = parts[2] ?? "";
  if (!body || !sig) return null;
  if (!safeEqual(signBody(body, secret), sig)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as LicensePayload;
    if (parsed.module !== SUPPORT_CHAT_MODULE_ID) return null;
    if (parsed.exp && new Date(parsed.exp).getTime() <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function issueSupportChatLicenseKey(expiresAt?: Date | null) {
  const secret = licenseSecret();
  if (!secret) {
    throw new Error("Lisans imzası için MODULE_LICENSE_SECRET veya AUTH_SECRET gerekli.");
  }
  const payload: LicensePayload = { module: SUPPORT_CHAT_MODULE_ID };
  if (expiresAt) payload.exp = expiresAt.toISOString();
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `IA-SCHAT.${body}.${signBody(body, secret)}`;
}

export async function isSupportChatLicensed(): Promise<boolean> {
  const state = await loadSupportChatLicenseState();
  return state.licensed;
}

export async function loadSupportChatLicenseState(): Promise<SupportChatLicenseState> {
  const empty: SupportChatLicenseState = {
    licensed: false,
    expiresAt: null,
    activatedAt: null,
  };
  try {
    const rows = await prisma.$queryRaw<
      Array<{
        status: string;
        expiresAt: Date | null;
        activatedAt: Date | null;
        licenseKey: string;
      }>
    >`
      SELECT status, expiresAt, activatedAt, licenseKey
      FROM site_modules
      WHERE moduleId = ${SUPPORT_CHAT_MODULE_ID}
      LIMIT 1
    `;
    const row = rows[0];
    if (!row || row.status !== "ACTIVE") return empty;
    if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) return empty;
    if (!parseSupportChatLicenseKey(row.licenseKey)) return empty;
    return {
      licensed: true,
      expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
      activatedAt: row.activatedAt ? row.activatedAt.toISOString() : null,
    };
  } catch {
    return empty;
  }
}

export async function activateSupportChatLicense(licenseKey: string) {
  const parsed = parseSupportChatLicenseKey(licenseKey);
  if (!parsed) return { error: "Lisans anahtarı geçersiz veya süresi dolmuş." };
  const expiresAt = parsed.exp ? new Date(parsed.exp) : null;
  const payload = JSON.stringify(parsed);
  try {
    await prisma.$executeRaw`
      INSERT INTO site_modules
        (id, moduleId, licenseKey, status, activatedAt, expiresAt, payloadJson, createdAt, updatedAt)
      VALUES
        (${crypto.randomUUID()}, ${SUPPORT_CHAT_MODULE_ID}, ${licenseKey.trim()}, 'ACTIVE', NOW(3), ${expiresAt}, ${payload}, NOW(3), NOW(3))
      ON DUPLICATE KEY UPDATE
        licenseKey = VALUES(licenseKey),
        status = 'ACTIVE',
        activatedAt = NOW(3),
        expiresAt = VALUES(expiresAt),
        payloadJson = VALUES(payloadJson),
        updatedAt = NOW(3)
    `;
    await seedSupportChatDefaults();
    return { ok: true as const };
  } catch {
    return { error: "Lisans kaydedilemedi. Veritabanı tabloları henüz kurulmamış olabilir." };
  }
}

export async function deactivateSupportChatLicense() {
  try {
    await prisma.$executeRaw`
      UPDATE site_modules
      SET status = 'INACTIVE', updatedAt = NOW(3)
      WHERE moduleId = ${SUPPORT_CHAT_MODULE_ID}
    `;
    return { ok: true as const };
  } catch {
    return { error: "Lisans durdurulamadı." };
  }
}

async function seedSupportChatDefaults() {
  try {
    const existing = await prisma.$queryRaw<Array<{ n: bigint | number }>>`
      SELECT COUNT(*) AS n FROM support_chat_tags
    `;
    if (Number(existing[0]?.n ?? 0) > 0) return;
    const tags = [
      { name: "Sipariş Verecek", color: "#ef4444" },
      { name: "Yeni Müşteri", color: "#f97316" },
      { name: "Sonra Aranacak", color: "#22c55e" },
      { name: "Eksik Sipariş", color: "#0f172a" },
    ];
    for (const [index, tag] of tags.entries()) {
      await prisma.$executeRaw`
        INSERT INTO support_chat_tags (id, name, color, sortOrder, createdAt)
        VALUES (${crypto.randomUUID()}, ${tag.name}, ${tag.color}, ${index}, NOW(3))
      `;
    }
  } catch {
    // Isolated: missing tables must not break activation.
  }
}
