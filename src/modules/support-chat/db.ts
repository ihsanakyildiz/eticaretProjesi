import "server-only";

import { Prisma } from "@prisma/client";
import { joinFullName } from "@/lib/customers";
import { prisma } from "@/lib/prisma";
import { linkSupportChatCustomer } from "@/modules/support-chat/customer-profiles";
import {
  canSupportChatAppendMessage,
  canSupportChatCreateConversation,
  canSupportChatReopenBlockedThread,
  type SupportChatIngestOrigin,
} from "@/modules/support-chat/sync-policy";
import { normalizeWhatsAppTo } from "@/modules/support-chat/whatsapp-template";
import {
  isSafeSupportChatMediaSrc,
  isSupportChatChannel,
  isSupportChatFolder,
  parseSupportChatMediaItems,
  parseSupportChatMediaQuote,
  serializeSupportChatMessageExtras,
  supportChatChannelLabel,
  supportChatMediaKindLabel,
  supportChatMessagePreview,
  type SupportChatMediaItem,
  type SupportChatQuote,
  type SupportChatAccountRow,
  type SupportChatAccountStatus,
  type SupportChatChannel,
  type SupportChatConversationRow,
  type SupportChatDirection,
  type SupportChatFolder,
  type SupportChatMessageRow,
  type SupportChatDepartmentRow,
  type SupportChatReplyRow,
  type SupportChatTagRow,
} from "@/modules/support-chat/kinds";

export type {
  SupportChatAccountRow,
  SupportChatConversationRow,
  SupportChatDepartmentRow,
  SupportChatMessageRow,
  SupportChatReplyRow,
  SupportChatTagRow,
};

function asStatus(value: string): SupportChatAccountStatus {
  return value === "DISABLED" ? "DISABLED" : "ACTIVE";
}

export async function listSupportChatAccounts(): Promise<SupportChatAccountRow[]> {
  try {
    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        channel: string;
        name: string;
        externalId: string;
        status: string;
        departmentId: string | null;
        credentialsJson: string;
        createdAt: Date;
      }>
    >`
      SELECT id, channel, name, externalId, status, departmentId, credentialsJson, createdAt
      FROM support_chat_accounts
      ORDER BY createdAt DESC
    `;
    return rows.flatMap((row) => {
      if (!isSupportChatChannel(row.channel)) return [];
      const credentials = credentialsMap(row.credentialsJson);
      return [
        {
          id: row.id,
          channel: row.channel,
          channelLabel: supportChatChannelLabel(row.channel),
          name: row.name,
          externalId: row.externalId,
          status: asStatus(row.status),
          departmentId: row.departmentId,
          pageId: credentials.pageId || row.externalId,
          instagramId: credentials.instagramId || "",
          instagramUsername: credentials.instagramUsername || "",
          phoneNumberId: credentials.phoneNumberId || "",
          hasPageToken: Boolean(credentials.pageAccessToken || credentials.userAccessToken),
          createdAt: row.createdAt.toISOString(),
        },
      ];
    });
  } catch {
    return [];
  }
}

export async function upsertSupportChatAccount(input: {
  channel: SupportChatChannel;
  name: string;
  externalId: string;
  credentialsJson: string;
}) {
  const name = input.name.trim().slice(0, 191);
  const externalId = input.externalId.trim().slice(0, 191);
  if (name.length < 2) return { error: "Hesap adı en az 2 karakter olmalı." };
  try {
    const existing = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM support_chat_accounts
      WHERE channel = ${input.channel} AND externalId = ${externalId}
      LIMIT 1
    `;
    if (existing[0]) {
      await prisma.$executeRaw`
        UPDATE support_chat_accounts
        SET name = ${name}, credentialsJson = ${input.credentialsJson}, status = 'ACTIVE', updatedAt = NOW(3)
        WHERE id = ${existing[0].id}
      `;
      invalidateSupportChatAccountCache();
      return { ok: true as const, id: existing[0].id };
    }
    const id = crypto.randomUUID();
    await prisma.$executeRaw`
      INSERT INTO support_chat_accounts
        (id, channel, name, externalId, status, credentialsJson, webhookSecret, createdAt, updatedAt)
      VALUES
        (${id}, ${input.channel}, ${name}, ${externalId}, 'ACTIVE', ${input.credentialsJson}, NULL, NOW(3), NOW(3))
    `;
    invalidateSupportChatAccountCache();
    return { ok: true as const, id };
  } catch {
    return { error: "Hesap kaydedilemedi." };
  }
}

export async function createSupportChatAccount(input: {
  channel: SupportChatChannel;
  name: string;
  externalId: string;
  credentialsJson?: string;
  departmentId?: string | null;
}) {
  const name = input.name.trim().slice(0, 191);
  const externalId = input.externalId.trim().slice(0, 191);
  const departmentId = input.departmentId?.trim() || null;
  if (name.length < 2) return { error: "Hesap adı en az 2 karakter olmalı." };
  if (departmentId) {
    const found = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM support_chat_departments WHERE id = ${departmentId} LIMIT 1
    `;
    if (!found[0]) return { error: "Departman bulunamadı." };
  }
  try {
    await prisma.$executeRaw`
      INSERT INTO support_chat_accounts
        (id, channel, name, externalId, status, credentialsJson, webhookSecret, departmentId, createdAt, updatedAt)
      VALUES
        (${crypto.randomUUID()}, ${input.channel}, ${name}, ${externalId}, 'ACTIVE', ${input.credentialsJson ?? "{}"}, NULL, ${departmentId}, NOW(3), NOW(3))
    `;
    invalidateSupportChatAccountCache();
    return { ok: true as const };
  } catch {
    return { error: "Hesap eklenemedi." };
  }
}

export async function setSupportChatAccountDepartment(id: string, departmentId: string | null) {
  const accountId = id.trim();
  if (!accountId) return { error: "Hesap bulunamadı." };
  const nextId = departmentId?.trim() || null;
  try {
    if (nextId) {
      const found = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM support_chat_departments WHERE id = ${nextId} LIMIT 1
      `;
      if (!found[0]) return { error: "Departman bulunamadı." };
    }
    const count = await prisma.$executeRaw`
      UPDATE support_chat_accounts
      SET departmentId = ${nextId}, updatedAt = NOW(3)
      WHERE id = ${accountId}
    `;
    if (Number(count) < 1) return { error: "Hesap bulunamadı." };
    if (nextId) {
      await prisma.$executeRaw`
        UPDATE support_chat_conversations
        SET departmentId = ${nextId}, updatedAt = NOW(3)
        WHERE accountId = ${accountId}
      `;
    }
    invalidateSupportChatAccountCache();
    return { ok: true as const, departmentId: nextId };
  } catch {
    return { error: "Departman atanamadı." };
  }
}

export async function setSupportChatAccountStatus(id: string, status: SupportChatAccountStatus) {
  try {
    await prisma.$executeRaw`
      UPDATE support_chat_accounts SET status = ${status}, updatedAt = NOW(3) WHERE id = ${id}
    `;
    invalidateSupportChatAccountCache();
    return { ok: true as const };
  } catch {
    return { error: "Hesap güncellenemedi." };
  }
}

export async function deleteSupportChatAccount(id: string) {
  try {
    await prisma.$executeRaw`DELETE FROM support_chat_accounts WHERE id = ${id}`;
    invalidateSupportChatAccountCache();
    return { ok: true as const };
  } catch {
    return { error: "Hesap silinemedi." };
  }
}

export async function listSupportChatTags(): Promise<SupportChatTagRow[]> {
  try {
    const rows = await prisma.$queryRaw<
      Array<{ id: string; name: string; color: string; sortOrder: number }>
    >`
      SELECT id, name, color, sortOrder FROM support_chat_tags ORDER BY sortOrder ASC, name ASC
    `;
    return rows;
  } catch {
    return [];
  }
}

export async function createSupportChatTag(input: { name: string; color: string }) {
  const name = input.name.trim().slice(0, 80);
  const color = /^#[0-9a-fA-F]{6}$/.test(input.color.trim()) ? input.color.trim() : "#405189";
  if (name.length < 2) return { error: "Etiket adı en az 2 karakter olmalı." };
  try {
    await prisma.$executeRaw`
      INSERT INTO support_chat_tags (id, name, color, sortOrder, createdAt)
      VALUES (${crypto.randomUUID()}, ${name}, ${color}, 99, NOW(3))
    `;
    return { ok: true as const };
  } catch {
    return { error: "Etiket eklenemedi." };
  }
}

export async function listSupportChatDepartments(): Promise<SupportChatDepartmentRow[]> {
  try {
    const rows = await prisma.$queryRaw<
      Array<{ id: string; name: string; color: string; sortOrder: number }>
    >`
      SELECT id, name, color, sortOrder FROM support_chat_departments ORDER BY sortOrder ASC, name ASC
    `;
    return rows;
  } catch {
    return [];
  }
}

function normalizeDepartmentColor(color: string) {
  return /^#[0-9a-fA-F]{6}$/.test(color.trim()) ? color.trim() : "#405189";
}

export async function createSupportChatDepartment(input: { name: string; color: string }) {
  const name = input.name.trim().slice(0, 80);
  const color = normalizeDepartmentColor(input.color);
  if (name.length < 2) return { error: "Departman adı en az 2 karakter olmalı." };
  try {
    const last = await prisma.$queryRaw<Array<{ n: number | bigint | null }>>`
      SELECT MAX(sortOrder) AS n FROM support_chat_departments
    `;
    const sortOrder = Number(last[0]?.n ?? 0) + 1;
    await prisma.$executeRaw`
      INSERT INTO support_chat_departments (id, name, color, sortOrder, createdAt)
      VALUES (${crypto.randomUUID()}, ${name}, ${color}, ${sortOrder}, NOW(3))
    `;
    return { ok: true as const };
  } catch {
    return { error: "Departman eklenemedi. Aynı isim zaten var olabilir." };
  }
}

export async function updateSupportChatDepartment(input: { id: string; name: string; color: string }) {
  const id = input.id.trim();
  const name = input.name.trim().slice(0, 80);
  const color = normalizeDepartmentColor(input.color);
  if (!id) return { error: "Departman bulunamadı." };
  if (name.length < 2) return { error: "Departman adı en az 2 karakter olmalı." };
  try {
    const count = await prisma.$executeRaw`
      UPDATE support_chat_departments
      SET name = ${name}, color = ${color}
      WHERE id = ${id}
    `;
    if (Number(count) < 1) return { error: "Departman bulunamadı." };
    return { ok: true as const };
  } catch {
    return { error: "Departman güncellenemedi. Aynı isim zaten var olabilir." };
  }
}

export async function deleteSupportChatDepartment(id: string) {
  try {
    await prisma.$executeRaw`DELETE FROM support_chat_departments WHERE id = ${id}`;
    return { ok: true as const };
  } catch {
    return { error: "Departman silinemedi." };
  }
}

export async function listSupportChatStaffDepartmentIds(userId: string): Promise<string[]> {
  if (!userId) return [];
  try {
    const rows = await prisma.$queryRaw<Array<{ departmentId: string }>>`
      SELECT departmentId FROM support_chat_staff_departments WHERE userId = ${userId}
    `;
    return rows.map((row) => row.departmentId);
  } catch {
    return [];
  }
}

export async function listSupportChatStaffDepartmentNamesByUser(
  userIds: string[],
): Promise<Record<string, Array<{ name: string; color: string }>>> {
  const unique = [...new Set(userIds.map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0) return {};
  try {
    const rows = await prisma.$queryRaw<Array<{ userId: string; name: string; color: string }>>`
      SELECT sd.userId, d.name, d.color
      FROM support_chat_staff_departments sd
      INNER JOIN support_chat_departments d ON d.id = sd.departmentId
      WHERE sd.userId IN (${Prisma.join(unique)})
      ORDER BY d.sortOrder ASC, d.name ASC
    `;
    const map: Record<string, Array<{ name: string; color: string }>> = {};
    for (const row of rows) {
      (map[row.userId] ??= []).push({ name: row.name, color: row.color });
    }
    return map;
  } catch {
    return {};
  }
}

export async function replaceSupportChatStaffDepartments(userId: string, departmentIds: string[]) {
  if (!userId) return;
  const unique = [...new Set(departmentIds.map((id) => id.trim()).filter(Boolean))];
  try {
    await prisma.$executeRaw`DELETE FROM support_chat_staff_departments WHERE userId = ${userId}`;
    if (unique.length === 0) return;
    const existing = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM support_chat_departments WHERE id IN (${Prisma.join(unique)})
    `;
    const valid = new Set(existing.map((row) => row.id));
    for (const departmentId of unique) {
      if (!valid.has(departmentId)) continue;
      await prisma.$executeRaw`
        INSERT INTO support_chat_staff_departments (userId, departmentId)
        VALUES (${userId}, ${departmentId})
      `;
    }
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function deleteSupportChatTag(id: string) {
  try {
    await prisma.$executeRaw`DELETE FROM support_chat_conversation_tags WHERE tagId = ${id}`;
    await prisma.$executeRaw`DELETE FROM support_chat_tags WHERE id = ${id}`;
    return { ok: true as const };
  } catch {
    return { error: "Etiket silinemedi." };
  }
}

export async function listSupportChatReplies(): Promise<SupportChatReplyRow[]> {
  try {
    return await prisma.$queryRaw<SupportChatReplyRow[]>`
      SELECT id, title, body, sortOrder
      FROM support_chat_canned_replies
      ORDER BY sortOrder ASC, title ASC
    `;
  } catch {
    return [];
  }
}

export async function createSupportChatReply(input: { title: string; body: string }) {
  const title = input.title.trim().slice(0, 120);
  const body = input.body.trim().slice(0, 4000);
  if (title.length < 2 || body.length < 2) {
    return { error: "Başlık ve yanıt metni gerekli." };
  }
  try {
    await prisma.$executeRaw`
      INSERT INTO support_chat_canned_replies (id, title, body, sortOrder, createdAt)
      VALUES (${crypto.randomUUID()}, ${title}, ${body}, 99, NOW(3))
    `;
    return { ok: true as const };
  } catch {
    return { error: "Hazır yanıt eklenemedi." };
  }
}

export async function deleteSupportChatReply(id: string) {
  try {
    await prisma.$executeRaw`DELETE FROM support_chat_canned_replies WHERE id = ${id}`;
    return { ok: true as const };
  } catch {
    return { error: "Hazır yanıt silinemedi." };
  }
}

export async function listSupportChatConversations(): Promise<SupportChatConversationRow[]> {
  try {
    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        accountId: string;
        channel: string;
        customerUserId: string | null;
        customerName: string;
        customerHandle: string | null;
        customerAvatar: string | null;
        lastMessagePreview: string;
        lastMessageAt: Date | null;
        unreadCount: number;
        assignedUserId: string | null;
        assignedName: string | null;
        departmentId: string | null;
        departmentName: string | null;
        departmentColor: string | null;
        folder: string;
        status: string;
        handledBy: string;
        sourceUrl: string | null;
        sourceTitle: string | null;
        sourceImage: string | null;
      }>
    >`
      SELECT
        c.id,
        c.accountId,
        c.channel,
        c.customerUserId,
        c.customerName,
        c.customerHandle,
        c.customerAvatar,
        c.lastMessagePreview,
        c.lastMessageAt,
        c.unreadCount,
        c.assignedUserId,
        u.name AS assignedName,
        c.departmentId,
        d.name AS departmentName,
        d.color AS departmentColor,
        c.folder,
        c.status,
        c.handledBy,
        c.sourceUrl,
        c.sourceTitle,
        c.sourceImage
      FROM support_chat_conversations c
      LEFT JOIN users u ON u.id = c.assignedUserId
      LEFT JOIN support_chat_departments d ON d.id = c.departmentId
      ORDER BY COALESCE(c.lastMessageAt, c.createdAt) DESC
      LIMIT 400
    `;
    return rows.flatMap((row) => {
      if (!isSupportChatChannel(row.channel)) return [];
      const folder: SupportChatFolder = isSupportChatFolder(row.folder) ? row.folder : "INBOX";
      return [
        {
          id: row.id,
          accountId: row.accountId,
          channel: row.channel,
          channelLabel: supportChatChannelLabel(row.channel),
          customerUserId: row.customerUserId,
          customerName: row.customerName,
          customerHandle: row.customerHandle,
          customerAvatar: row.customerAvatar,
          lastMessagePreview: row.lastMessagePreview,
          lastMessageAt: row.lastMessageAt ? row.lastMessageAt.toISOString() : null,
          unreadCount: Number(row.unreadCount),
          assignedUserId: row.assignedUserId,
          assignedName: row.assignedName,
          departmentId: row.departmentId,
          departmentName: row.departmentName,
          departmentColor: row.departmentColor,
          folder,
          status: row.status,
          handledBy: row.handledBy,
          sourceUrl: row.sourceUrl,
          sourceTitle: row.sourceTitle,
          sourceImage: row.sourceImage,
        },
      ];
    });
  } catch {
    return [];
  }
}

export async function listSupportChatMessages(conversationId: string): Promise<SupportChatMessageRow[]> {
  try {
    const rows = await prisma.$queryRaw<
      Array<{ id: string; direction: string; body: string; sentAt: Date; mediaJson: string | null }>
    >`
      SELECT id, direction, body, sentAt, mediaJson
      FROM support_chat_messages
      WHERE conversationId = ${conversationId}
      ORDER BY sentAt ASC
      LIMIT 200
    `;
    return rows.map((row) => ({
      id: row.id,
      direction: row.direction === "OUT" ? "OUT" : "IN",
      body: row.body,
      sentAt: row.sentAt.toISOString(),
      quote: parseSupportChatMediaQuote(row.mediaJson),
      media: parseSupportChatMediaItems(row.mediaJson),
    }));
  } catch {
    return [];
  }
}

export type SupportChatAccountMatch = {
  id: string;
  channel: SupportChatChannel;
  name: string;
  externalId: string;
  departmentId: string | null;
  credentials: Record<string, string>;
};

function credentialsMap(raw: string): Record<string, string> {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value == null) continue;
      out[key] = String(value);
    }
    return out;
  } catch {
    return {};
  }
}

let activeAccountsCache: { at: number; rows: SupportChatAccountMatch[] } | null = null;

export function invalidateSupportChatAccountCache() {
  activeAccountsCache = null;
}

export async function listKnownSupportChatExternalIds(ids: string[]) {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  const known = new Set<string>();
  if (unique.length === 0) return known;
  try {
    for (let index = 0; index < unique.length; index += 80) {
      const chunk = unique.slice(index, index + 80);
      const rows = await prisma.$queryRaw<Array<{ externalId: string | null }>>`
        SELECT externalId FROM support_chat_messages
        WHERE externalId IN (${Prisma.join(chunk)})
      `;
      for (const row of rows) {
        if (row.externalId) known.add(row.externalId);
      }
    }
  } catch {
    return known;
  }
  return known;
}

let threadBlocksReady: Promise<void> | null = null;

async function ensureSupportChatThreadBlocks() {
  if (!threadBlocksReady) {
    threadBlocksReady = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS support_chat_thread_blocks (
          id VARCHAR(191) NOT NULL,
          accountId VARCHAR(191) NOT NULL,
          channel VARCHAR(32) NOT NULL,
          externalThreadId VARCHAR(191) NOT NULL,
          blockedAt DATETIME(3) NOT NULL,
          PRIMARY KEY (id),
          UNIQUE KEY support_chat_thread_blocks_account_thread_key (accountId, externalThreadId),
          INDEX support_chat_thread_blocks_blockedAt_idx (blockedAt)
        )
      `);
    })().catch((error) => {
      threadBlocksReady = null;
      throw error;
    });
  }
  await threadBlocksReady;
}

export async function listExistingSupportChatThreadIds(accountId: string, threadIds: string[]) {
  const unique = [...new Set(threadIds.map((id) => id.trim()).filter(Boolean))];
  const existing = new Set<string>();
  if (unique.length === 0) return existing;
  try {
    for (let index = 0; index < unique.length; index += 80) {
      const chunk = unique.slice(index, index + 80);
      const rows = await prisma.$queryRaw<Array<{ externalThreadId: string }>>`
        SELECT externalThreadId FROM support_chat_conversations
        WHERE accountId = ${accountId} AND externalThreadId IN (${Prisma.join(chunk)})
      `;
      for (const row of rows) existing.add(row.externalThreadId);
    }
  } catch {
    return existing;
  }
  return existing;
}

export async function listBlockedSupportChatThreadIds(accountId: string, threadIds: string[]) {
  const unique = [...new Set(threadIds.map((id) => id.trim()).filter(Boolean))];
  const blocked = new Set<string>();
  if (unique.length === 0) return blocked;
  try {
    await ensureSupportChatThreadBlocks();
    for (let index = 0; index < unique.length; index += 80) {
      const chunk = unique.slice(index, index + 80);
      const rows = await prisma.$queryRaw<Array<{ externalThreadId: string }>>`
        SELECT externalThreadId FROM support_chat_thread_blocks
        WHERE accountId = ${accountId} AND externalThreadId IN (${Prisma.join(chunk)})
      `;
      for (const row of rows) blocked.add(row.externalThreadId);
    }
  } catch (error) {
    console.warn(
      "support-chat: thread blocks could not be read",
      error instanceof Error ? error.message : error,
    );
  }
  return blocked;
}

async function isSupportChatThreadBlocked(accountId: string, threadId: string) {
  try {
    await ensureSupportChatThreadBlocks();
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM support_chat_thread_blocks
      WHERE accountId = ${accountId} AND externalThreadId = ${threadId}
      LIMIT 1
    `;
    return Boolean(rows[0]);
  } catch {
    return false;
  }
}

async function clearSupportChatThreadBlock(accountId: string, threadId: string) {
  try {
    await ensureSupportChatThreadBlocks();
    await prisma.$executeRaw`
      DELETE FROM support_chat_thread_blocks
      WHERE accountId = ${accountId} AND externalThreadId = ${threadId}
    `;
  } catch {
    /* ingest can continue */
  }
}

async function blockSupportChatThreads(
  rows: Array<{ accountId: string; channel: string; externalThreadId: string }>,
) {
  if (rows.length === 0) return;
  await ensureSupportChatThreadBlocks();
  for (const row of rows) {
    const threadId = row.externalThreadId.trim().slice(0, 191);
    if (!threadId) continue;
    const id = crypto.randomUUID();
    await prisma.$executeRaw`
      INSERT INTO support_chat_thread_blocks
        (id, accountId, channel, externalThreadId, blockedAt)
      VALUES
        (${id}, ${row.accountId}, ${row.channel}, ${threadId}, NOW(3))
      ON DUPLICATE KEY UPDATE
        channel = VALUES(channel),
        blockedAt = NOW(3)
    `;
  }
}

export async function readSupportChatHistoryWatermark(accountId: string) {
  try {
    const key = `history_watermark:${accountId}`;
    const rows = await prisma.$queryRaw<Array<{ settingValue: string }>>`
      SELECT settingValue FROM support_chat_settings
      WHERE settingKey = ${key}
      LIMIT 1
    `;
    const raw = rows[0]?.settingValue?.trim() ?? "";
    if (!raw) return null;
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

export async function writeSupportChatHistoryWatermark(accountId: string, at: Date) {
  const key = `history_watermark:${accountId}`;
  const value = at.toISOString();
  try {
    await prisma.$executeRaw`
      INSERT INTO support_chat_settings (settingKey, settingValue, updatedAt)
      VALUES (${key}, ${value}, NOW(3))
      ON DUPLICATE KEY UPDATE settingValue = ${value}, updatedAt = NOW(3)
    `;
  } catch (error) {
    console.warn(
      "support-chat: history watermark could not be saved",
      error instanceof Error ? error.message : error,
    );
  }
}

export async function listActiveSupportChatAccounts(): Promise<SupportChatAccountMatch[]> {
  if (activeAccountsCache && Date.now() - activeAccountsCache.at < 8_000) {
    return activeAccountsCache.rows;
  }
  try {
    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        channel: string;
        name: string;
        externalId: string;
        departmentId: string | null;
        credentialsJson: string;
      }>
    >`
      SELECT id, channel, name, externalId, departmentId, credentialsJson
      FROM support_chat_accounts
      WHERE status = 'ACTIVE'
    `;
    const mapped = rows.flatMap((row) => {
      if (!isSupportChatChannel(row.channel)) return [];
      return [
        {
          id: row.id,
          channel: row.channel,
          name: row.name,
          externalId: row.externalId,
          departmentId: row.departmentId,
          credentials: credentialsMap(row.credentialsJson),
        },
      ];
    });
    activeAccountsCache = { at: Date.now(), rows: mapped };
    return mapped;
  } catch {
    return [];
  }
}

export async function findSupportChatQuotedMessage(input: {
  conversationId?: string;
  messageId?: string | null;
  externalId?: string | null;
}): Promise<SupportChatQuote | null> {
  const messageId = input.messageId?.trim() || "";
  const externalId = input.externalId?.trim() || "";
  if (!messageId && !externalId) return null;
  try {
    const rows = messageId
      ? await prisma.$queryRaw<
          Array<{
            id: string;
            body: string;
            direction: string;
            externalId: string | null;
            conversationId: string;
            mediaJson: string | null;
          }>
        >`
          SELECT id, body, direction, externalId, conversationId, mediaJson
          FROM support_chat_messages
          WHERE id = ${messageId}
          LIMIT 1
        `
      : await prisma.$queryRaw<
          Array<{
            id: string;
            body: string;
            direction: string;
            externalId: string | null;
            conversationId: string;
            mediaJson: string | null;
          }>
        >`
          SELECT id, body, direction, externalId, conversationId, mediaJson
          FROM support_chat_messages
          WHERE externalId = ${externalId}
          LIMIT 1
        `;
    const row = rows[0];
    if (!row) return null;
    if (input.conversationId && row.conversationId !== input.conversationId) return null;
    const media = parseSupportChatMediaItems(row.mediaJson);
    return {
      messageId: row.id,
      externalId: row.externalId,
      body: supportChatMessagePreview(row.body, media),
      direction: row.direction === "OUT" ? "OUT" : "IN",
    };
  } catch {
    return null;
  }
}

async function accountDepartmentIdFor(accountId: string): Promise<string | null> {
  const cached = activeAccountsCache?.rows.find((row) => row.id === accountId);
  if (cached) return cached.departmentId;
  try {
    const rows = await prisma.$queryRaw<Array<{ departmentId: string | null }>>`
      SELECT departmentId FROM support_chat_accounts WHERE id = ${accountId} LIMIT 1
    `;
    return rows[0]?.departmentId ?? null;
  } catch {
    return null;
  }
}

export async function ingestSupportChatMessage(input: {
  accountId: string;
  channel: SupportChatChannel;
  externalThreadId: string;
  customerName: string;
  customerHandle: string | null;
  customerAvatar: string | null;
  body: string;
  direction: SupportChatDirection;
  externalId: string | null;
  sentAt: Date;
  quote?: SupportChatQuote | null;
  media?: SupportChatMediaItem[] | null;
  sourceUrl?: string | null;
  sourceTitle?: string | null;
  sourceImage?: string | null;
  customerEmail?: string | null;
  memberUserId?: string | null;
  autoReplyId?: string | null;
  origin?: SupportChatIngestOrigin;
}) {
  const threadId = input.externalThreadId.trim().slice(0, 191);
  const mediaItems = input.media?.filter((item) => item.src) ?? [];
  const body =
    input.body.trim().slice(0, 8000) ||
    (mediaItems[0] ? supportChatMediaKindLabel(mediaItems[0].kind) : "(medya)");
  const preview = supportChatMessagePreview(body, mediaItems);
  const customerName = (input.customerName.trim() || "Müşteri").slice(0, 191);
  const customerHandle = input.customerHandle?.trim().slice(0, 191) || null;
  const customerAvatar = input.customerAvatar?.trim().slice(0, 500) || null;
  const externalId = input.externalId?.trim().slice(0, 191) || null;
  const sourceUrl = input.sourceUrl?.trim().slice(0, 500) || null;
  const sourceTitle = input.sourceTitle?.trim().slice(0, 191) || null;
  const sourceImage = input.sourceImage?.trim().slice(0, 500) || null;
  if (!threadId) return { error: "thread" as const };
  const origin = input.origin ?? "local";
  const accountDepartmentId = await accountDepartmentIdFor(input.accountId);
  try {
    if (externalId) {
      const dup = await prisma.$queryRaw<Array<{ id: string; conversationId: string }>>`
        SELECT id, conversationId FROM support_chat_messages WHERE externalId = ${externalId} LIMIT 1
      `;
      if (dup[0]) {
        if (sourceUrl || sourceTitle || sourceImage) {
          await prisma.$executeRaw`
            UPDATE support_chat_conversations
            SET
              sourceUrl = COALESCE(${sourceUrl}, sourceUrl),
              sourceTitle = COALESCE(${sourceTitle}, sourceTitle),
              sourceImage = COALESCE(${sourceImage}, sourceImage),
              updatedAt = NOW(3)
            WHERE accountId = ${input.accountId} AND externalThreadId = ${threadId}
          `;
        }
        return { ok: true as const, duplicate: true, conversationId: dup[0].conversationId };
      }
    }
    const existing = await prisma.$queryRaw<Array<{ id: string; unreadCount: number }>>`
      SELECT id, unreadCount FROM support_chat_conversations
      WHERE accountId = ${input.accountId} AND externalThreadId = ${threadId}
      LIMIT 1
    `;
    let conversationId = existing[0]?.id;
    if (conversationId) {
      if (!canSupportChatAppendMessage(origin, input.sentAt)) {
        return { skipped: true as const, reason: "too_old" as const };
      }
    } else {
      const blocked = await isSupportChatThreadBlocked(input.accountId, threadId);
      if (blocked) {
        if (!canSupportChatReopenBlockedThread(origin, input.direction, input.sentAt)) {
          return { skipped: true as const, reason: "blocked" as const };
        }
        await clearSupportChatThreadBlock(input.accountId, threadId);
      } else if (!canSupportChatCreateConversation(origin, input.sentAt)) {
        return { skipped: true as const, reason: "too_old" as const };
      }
    }
    const unread =
      input.direction === "IN" ? Number(existing[0]?.unreadCount ?? 0) + 1 : Number(existing[0]?.unreadCount ?? 0);
    if (conversationId) {
      if (input.direction === "IN") {
        await prisma.$executeRaw`
          UPDATE support_chat_conversations
          SET
            customerName = ${customerName},
            customerHandle = ${customerHandle},
            customerAvatar = COALESCE(${customerAvatar}, customerAvatar),
            lastMessageAt = ${input.sentAt},
            lastMessagePreview = ${preview},
            unreadCount = ${unread},
            status = 'OPEN',
            folder = 'INBOX',
            sourceUrl = COALESCE(${sourceUrl}, sourceUrl),
            sourceTitle = COALESCE(${sourceTitle}, sourceTitle),
            sourceImage = COALESCE(${sourceImage}, sourceImage),
            departmentId = COALESCE(${accountDepartmentId}, departmentId),
            updatedAt = NOW(3)
          WHERE id = ${conversationId}
        `;
      } else {
        await prisma.$executeRaw`
          UPDATE support_chat_conversations
          SET
            lastMessageAt = ${input.sentAt},
            lastMessagePreview = ${preview},
            unreadCount = ${unread},
            status = 'OPEN',
            updatedAt = NOW(3)
          WHERE id = ${conversationId}
        `;
      }
    } else {
      conversationId = crypto.randomUUID();
      await prisma.$executeRaw`
        INSERT INTO support_chat_conversations
          (id, accountId, channel, externalThreadId, customerName, customerHandle, customerAvatar,
           lastMessageAt, lastMessagePreview, unreadCount, assignedUserId, departmentId, status, handledBy, folder,
           sourceUrl, sourceTitle, sourceImage, createdAt, updatedAt)
        VALUES
          (${conversationId}, ${input.accountId}, ${input.channel}, ${threadId}, ${customerName}, ${customerHandle},
           ${customerAvatar}, ${input.sentAt}, ${preview}, ${input.direction === "IN" ? 1 : 0}, NULL, ${accountDepartmentId}, 'OPEN', 'HUMAN', 'INBOX',
           ${sourceUrl}, ${sourceTitle}, ${sourceImage}, NOW(3), NOW(3))
      `;
    }
    let quote = input.quote ?? null;
    if (quote?.externalId && (!quote.body || quote.body === "Alıntılanan mesaj")) {
      const found = await findSupportChatQuotedMessage({
        conversationId,
        externalId: quote.externalId,
      });
      if (found) quote = found;
    }
    const mediaJson = serializeSupportChatMessageExtras({
      quote,
      media: mediaItems,
      autoReplyId: input.autoReplyId,
    });
    await prisma.$executeRaw`
      INSERT INTO support_chat_messages
        (id, conversationId, direction, body, mediaJson, externalId, sentAt, createdAt)
      VALUES
        (${crypto.randomUUID()}, ${conversationId}, ${input.direction}, ${body}, ${mediaJson}, ${externalId}, ${input.sentAt}, NOW(3))
    `;
    try {
      await linkSupportChatCustomer({
        conversationId,
        channel: input.channel,
        externalThreadId: threadId,
        customerName,
        customerHandle,
        customerAvatar,
        customerEmail: input.customerEmail,
        memberUserId: input.memberUserId,
      });
    } catch {
      /* inbound message already stored */
    }
    return { ok: true as const, duplicate: false, conversationId };
  } catch {
    return { error: "ingest" as const };
  }
}

export async function getSupportChatSendContext(conversationId: string) {
  try {
    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        channel: string;
        externalThreadId: string;
        assignedUserId: string | null;
        folder: string;
        accountId: string;
        customerName: string;
        credentialsJson: string;
        accountStatus: string;
      }>
    >`
      SELECT
        c.id,
        c.channel,
        c.externalThreadId,
        c.assignedUserId,
        c.folder,
        c.accountId,
        c.customerName,
        a.credentialsJson,
        a.status AS accountStatus
      FROM support_chat_conversations c
      INNER JOIN support_chat_accounts a ON a.id = c.accountId
      WHERE c.id = ${conversationId}
      LIMIT 1
    `;
    const row = rows[0];
    if (!row || !isSupportChatChannel(row.channel)) return null;
    return {
      id: row.id,
      accountId: row.accountId,
      channel: row.channel,
      externalThreadId: row.externalThreadId,
      assignedUserId: row.assignedUserId,
      folder: isSupportChatFolder(row.folder) ? row.folder : "INBOX",
      customerName: row.customerName,
      accountStatus: row.accountStatus,
      credentials: credentialsMap(row.credentialsJson),
    };
  } catch {
    return null;
  }
}

export async function assignSupportChatConversation(id: string, userId: string) {
  try {
    await prisma.$executeRaw`
      UPDATE support_chat_conversations
      SET assignedUserId = ${userId}, folder = 'INBOX', updatedAt = NOW(3)
      WHERE id = ${id} AND (assignedUserId IS NULL OR assignedUserId = ${userId})
    `;
    return { ok: true as const };
  } catch {
    return { error: "Konuşma atanamadı." };
  }
}

export async function reassignSupportChatConversation(id: string, userId: string) {
  const conversationId = id.trim();
  const assigneeId = userId.trim();
  if (!conversationId || !assigneeId) return { error: "Atama bilgisi eksik." };
  try {
    const assignee = await prisma.user.findFirst({
      where: { id: assigneeId, role: { in: ["ADMIN", "STAFF"] } },
      select: { id: true, name: true },
    });
    if (!assignee) return { error: "Temsilci bulunamadı." };
    const count = await prisma.$executeRaw`
      UPDATE support_chat_conversations
      SET assignedUserId = ${assigneeId}, folder = 'INBOX', updatedAt = NOW(3)
      WHERE id = ${conversationId}
    `;
    if (Number(count) < 1) return { error: "Konuşma bulunamadı." };
    return { ok: true as const, assignedName: assignee.name };
  } catch {
    return { error: "Konuşma atanamadı." };
  }
}

export async function unassignSupportChatConversation(id: string) {
  try {
    await prisma.$executeRaw`
      UPDATE support_chat_conversations
      SET assignedUserId = NULL, folder = 'INBOX', updatedAt = NOW(3)
      WHERE id = ${id}
    `;
    return { ok: true as const };
  } catch {
    return { error: "Konuşmadan çıkılamadı." };
  }
}

export async function setSupportChatConversationDepartment(id: string, departmentId: string | null) {
  const conversationId = id.trim();
  if (!conversationId) return { error: "Konuşma bulunamadı." };
  const nextId = departmentId?.trim() || null;
  try {
    if (nextId) {
      const found = await prisma.$queryRaw<Array<{ id: string; name: string; color: string }>>`
        SELECT id, name, color FROM support_chat_departments WHERE id = ${nextId} LIMIT 1
      `;
      if (!found[0]) return { error: "Departman bulunamadı." };
      const count = await prisma.$executeRaw`
        UPDATE support_chat_conversations
        SET departmentId = ${nextId}, updatedAt = NOW(3)
        WHERE id = ${conversationId}
      `;
      if (Number(count) < 1) return { error: "Konuşma bulunamadı." };
      return {
        ok: true as const,
        departmentId: found[0].id,
        departmentName: found[0].name,
        departmentColor: found[0].color,
      };
    }
    const count = await prisma.$executeRaw`
      UPDATE support_chat_conversations
      SET departmentId = NULL, updatedAt = NOW(3)
      WHERE id = ${conversationId}
    `;
    if (Number(count) < 1) return { error: "Konuşma bulunamadı." };
    return { ok: true as const, departmentId: null, departmentName: null, departmentColor: null };
  } catch {
    return { error: "Departman atanamadı." };
  }
}

export async function listSupportChatStaffDepartmentIdsByUser(
  userIds: string[],
): Promise<Record<string, string[]>> {
  const unique = [...new Set(userIds.map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0) return {};
  try {
    const rows = await prisma.$queryRaw<Array<{ userId: string; departmentId: string }>>`
      SELECT userId, departmentId
      FROM support_chat_staff_departments
      WHERE userId IN (${Prisma.join(unique)})
    `;
    const map: Record<string, string[]> = {};
    for (const row of rows) {
      (map[row.userId] ??= []).push(row.departmentId);
    }
    return map;
  } catch {
    return {};
  }
}

export async function countOwnSupportChatInboxWorkload(userId: string) {
  const ownerId = userId.trim();
  if (!ownerId) return { assignedInbox: 0, unreadInbox: 0 };
  try {
    const rows = await prisma.$queryRaw<Array<{ assignedInbox: bigint | number | null; unreadInbox: bigint | number | null }>>`
      SELECT
        COALESCE(SUM(CASE WHEN folder = 'INBOX' THEN 1 ELSE 0 END), 0) AS assignedInbox,
        COALESCE(SUM(CASE WHEN folder = 'INBOX' AND unreadCount > 0 THEN 1 ELSE 0 END), 0) AS unreadInbox
      FROM support_chat_conversations
      WHERE assignedUserId = ${ownerId}
    `;
    return {
      assignedInbox: Number(rows[0]?.assignedInbox ?? 0),
      unreadInbox: Number(rows[0]?.unreadInbox ?? 0),
    };
  } catch {
    return { assignedInbox: 0, unreadInbox: 0 };
  }
}

export async function bulkUnassignOwnSupportChatConversations(userId: string) {
  const ownerId = userId.trim();
  if (!ownerId) return { error: "Oturum bulunamadı." };
  try {
    const count = await prisma.$executeRaw`
      UPDATE support_chat_conversations
      SET assignedUserId = NULL, folder = 'INBOX', updatedAt = NOW(3)
      WHERE assignedUserId = ${ownerId} AND folder = 'INBOX'
    `;
    return { ok: true as const, count: Number(count) };
  } catch {
    return { error: "Konuşmalardan çıkılamadı." };
  }
}

export async function bulkArchiveOwnSupportChatConversations(userId: string) {
  const ownerId = userId.trim();
  if (!ownerId) return { error: "Oturum bulunamadı." };
  try {
    const count = await prisma.$executeRaw`
      UPDATE support_chat_conversations
      SET folder = 'ARCHIVE', updatedAt = NOW(3)
      WHERE assignedUserId = ${ownerId} AND folder = 'INBOX'
    `;
    return { ok: true as const, count: Number(count) };
  } catch {
    return { error: "Konuşmalar arşivlenemedi." };
  }
}

export async function bulkMarkOwnSupportChatConversationsRead(userId: string) {
  const ownerId = userId.trim();
  if (!ownerId) return { error: "Oturum bulunamadı." };
  try {
    const count = await prisma.$executeRaw`
      UPDATE support_chat_conversations
      SET unreadCount = 0, updatedAt = NOW(3)
      WHERE assignedUserId = ${ownerId} AND folder = 'INBOX' AND unreadCount > 0
    `;
    return { ok: true as const, count: Number(count) };
  } catch {
    return { error: "Konuşmalar okundu işaretlenemedi." };
  }
}

export type WhatsAppRecipientHit = {
  conversationId: string | null;
  name: string;
  phone: string;
};

export async function searchWhatsAppRecipients(query: string): Promise<WhatsAppRecipientHit[]> {
  const needle = query.trim().slice(0, 80);
  if (needle.length < 2) return [];
  const like = `%${needle.replace(/[%_]/g, "")}%`;
  const digits = needle.replace(/\D/g, "");
  const phoneLike = digits.length >= 4 ? `%${digits}%` : like;
  try {
    const chats = await prisma.$queryRaw<
      Array<{ id: string; customerName: string; customerHandle: string | null; externalThreadId: string }>
    >`
      SELECT id, customerName, customerHandle, externalThreadId
      FROM support_chat_conversations
      WHERE channel = 'WHATSAPP'
        AND (
          customerName LIKE ${like}
          OR customerHandle LIKE ${like}
          OR externalThreadId LIKE ${phoneLike}
        )
      ORDER BY lastMessageAt DESC
      LIMIT 12
    `;
    const members = await prisma.$queryRaw<
      Array<{ name: string | null; firstName: string | null; lastName: string | null; phone: string | null }>
    >`
      SELECT name, firstName, lastName, phone
      FROM users
      WHERE phone IS NOT NULL AND phone <> ''
        AND (
          name LIKE ${like}
          OR firstName LIKE ${like}
          OR lastName LIKE ${like}
          OR phone LIKE ${phoneLike}
        )
      ORDER BY updatedAt DESC
      LIMIT 12
    `;
    const hits: WhatsAppRecipientHit[] = [];
    const seen = new Set<string>();
    for (const row of chats) {
      const phone = normalizeWhatsAppTo(row.externalThreadId || row.customerHandle || "");
      if (!phone || seen.has(phone)) continue;
      seen.add(phone);
      hits.push({
        conversationId: row.id,
        name: row.customerName || phone,
        phone,
      });
    }
    for (const row of members) {
      const phone = normalizeWhatsAppTo(row.phone || "");
      if (!phone || seen.has(phone)) continue;
      seen.add(phone);
      hits.push({
        conversationId: null,
        name: row.name?.trim() || joinFullName(row.firstName ?? "", row.lastName ?? "") || phone,
        phone,
      });
    }
    return hits.slice(0, 12);
  } catch {
    return [];
  }
}

export async function setSupportChatConversationFolder(id: string, folder: SupportChatFolder) {
  try {
    await prisma.$executeRaw`
      UPDATE support_chat_conversations
      SET folder = ${folder}, updatedAt = NOW(3)
      WHERE id = ${id}
    `;
    return { ok: true as const };
  } catch {
    return { error: "Klasör güncellenemedi." };
  }
}

function collectLocalUploadSrcs(values: Array<string | null | undefined>) {
  return values.flatMap((value) => (value && isSafeSupportChatMediaSrc(value) ? [value] : []));
}

export async function permanentlyDeleteSupportChatConversations(ids: string[]) {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0) return { ok: true as const, deleted: 0, mediaSrcs: [] as string[] };
  try {
    const conversations = await prisma.$queryRaw<
      Array<{
        id: string;
        accountId: string;
        channel: string;
        externalThreadId: string;
        customerAvatar: string | null;
        sourceImage: string | null;
      }>
    >`
      SELECT id, accountId, channel, externalThreadId, customerAvatar, sourceImage
      FROM support_chat_conversations
      WHERE folder = 'TRASH' AND id IN (${Prisma.join(unique)})
    `;
    if (conversations.length === 0) {
      return { error: "Yalnızca çöp kutusundaki konuşmalar kalıcı silinebilir." };
    }
    const trashIds = conversations.map((row) => row.id);
    try {
      await blockSupportChatThreads(conversations);
    } catch (error) {
      console.warn(
        "support-chat: deleted thread blocks could not be saved",
        error instanceof Error ? error.message : error,
      );
    }
    const messages = await prisma.$queryRaw<Array<{ mediaJson: string | null }>>`
      SELECT mediaJson FROM support_chat_messages
      WHERE conversationId IN (${Prisma.join(trashIds)})
    `;
    const mediaSrcs = [
      ...collectLocalUploadSrcs(conversations.flatMap((row) => [row.customerAvatar, row.sourceImage])),
      ...messages.flatMap((row) => parseSupportChatMediaItems(row.mediaJson).map((item) => item.src)),
    ];
    await prisma.$transaction([
      prisma.$executeRaw`
        DELETE FROM support_chat_conversation_tags
        WHERE conversationId IN (${Prisma.join(trashIds)})
      `,
      prisma.$executeRaw`
        DELETE FROM support_chat_notes
        WHERE conversationId IN (${Prisma.join(trashIds)})
      `,
      prisma.$executeRaw`
        DELETE FROM support_chat_messages
        WHERE conversationId IN (${Prisma.join(trashIds)})
      `,
      prisma.$executeRaw`
        DELETE FROM support_chat_conversations
        WHERE folder = 'TRASH' AND id IN (${Prisma.join(trashIds)})
      `,
    ]);
    return { ok: true as const, deleted: trashIds.length, mediaSrcs };
  } catch {
    return { error: "Konuşmalar kalıcı silinemedi." };
  }
}

export async function emptySupportChatTrash() {
  try {
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM support_chat_conversations WHERE folder = 'TRASH'
    `;
    return permanentlyDeleteSupportChatConversations(rows.map((row) => row.id));
  } catch {
    return { error: "Çöp kutusu boşaltılamadı." };
  }
}

export async function markSupportChatConversationRead(id: string) {
  try {
    await prisma.$executeRaw`
      UPDATE support_chat_conversations
      SET unreadCount = 0, updatedAt = NOW(3)
      WHERE id = ${id}
    `;
    return { ok: true as const };
  } catch {
    return { error: "Okundu işareti verilemedi." };
  }
}

export async function markSupportChatConversationUnread(id: string) {
  try {
    await prisma.$executeRaw`
      UPDATE support_chat_conversations
      SET unreadCount = CASE WHEN unreadCount < 1 THEN 1 ELSE unreadCount END, updatedAt = NOW(3)
      WHERE id = ${id}
    `;
    return { ok: true as const };
  } catch {
    return { error: "Okunmadı işareti verilemedi." };
  }
}

export async function listSupportChatConversationsMissingSource() {
  try {
    return await prisma.$queryRaw<
      Array<{
        id: string;
        channel: string;
        externalThreadId: string;
        sourceUrl: string | null;
        accountExternalId: string;
        credentialsJson: string;
      }>
    >`
      SELECT c.id, c.channel, c.externalThreadId, c.sourceUrl, a.externalId AS accountExternalId, a.credentialsJson
      FROM support_chat_conversations c
      INNER JOIN support_chat_accounts a ON a.id = c.accountId
      WHERE c.channel IN ('FACEBOOK_POST', 'INSTAGRAM_POST')
        AND (
          c.sourceUrl IS NULL OR c.sourceUrl = ''
          OR c.sourceImage IS NULL OR c.sourceImage = ''
        )
      LIMIT 8
    `;
  } catch {
    return [];
  }
}

export async function listSupportChatConversationsMissingAvatar() {
  try {
    return await prisma.$queryRaw<
      Array<{
        id: string;
        accountId: string;
        channel: string;
        externalThreadId: string;
        customerName: string;
        customerHandle: string | null;
        credentialsJson: string;
      }>
    >`
      SELECT c.id, c.accountId, c.channel, c.externalThreadId, c.customerName, c.customerHandle, a.credentialsJson
      FROM support_chat_conversations c
      INNER JOIN support_chat_accounts a ON a.id = c.accountId
      WHERE c.channel IN ('FACEBOOK_MESSENGER', 'FACEBOOK_POST', 'INSTAGRAM_DM', 'INSTAGRAM_POST', 'WHATSAPP')
        AND (c.customerAvatar IS NULL OR c.customerAvatar = '')
      ORDER BY
        CASE c.channel
          WHEN 'INSTAGRAM_DM' THEN 0
          WHEN 'INSTAGRAM_POST' THEN 1
          WHEN 'WHATSAPP' THEN 2
          ELSE 3
        END,
        c.lastMessageAt DESC
      LIMIT 12
    `;
  } catch {
    return [];
  }
}

export async function fillSupportChatConversationAvatar(
  accountId: string,
  threadId: string,
  avatar: string,
) {
  const src = avatar.trim().slice(0, 500);
  if (!accountId || !threadId || !src) return;
  try {
    await prisma.$executeRaw`
      UPDATE support_chat_conversations
      SET
        customerAvatar = COALESCE(NULLIF(customerAvatar, ''), ${src}),
        updatedAt = NOW(3)
      WHERE accountId = ${accountId} AND externalThreadId = ${threadId}
    `;
  } catch {
    /* isolated */
  }
}

export async function fillSupportChatConversationSource(
  accountId: string,
  threadId: string,
  source: { url: string; title: string; image?: string | null },
) {
  const url = source.url.trim().slice(0, 500);
  const title = source.title.trim().slice(0, 191);
  const image = source.image?.trim().slice(0, 500) || null;
  if (!accountId || !threadId || !url) return;
  try {
    await prisma.$executeRaw`
      UPDATE support_chat_conversations
      SET
        sourceUrl = COALESCE(NULLIF(sourceUrl, ''), ${url}),
        sourceTitle = COALESCE(NULLIF(sourceTitle, ''), ${title}),
        sourceImage = COALESCE(NULLIF(sourceImage, ''), ${image}),
        updatedAt = NOW(3)
      WHERE accountId = ${accountId} AND externalThreadId = ${threadId}
    `;
  } catch {
    /* isolated */
  }
}

export async function updateSupportChatConversationSource(
  id: string,
  source: { url: string; title: string; image?: string | null },
) {
  const url = source.url.trim().slice(0, 500);
  const title = source.title.trim().slice(0, 191);
  const image = source.image?.trim().slice(0, 500) || null;
  if (!id || !url) return;
  try {
    await prisma.$executeRaw`
      UPDATE support_chat_conversations
      SET
        sourceUrl = ${url},
        sourceTitle = ${title},
        sourceImage = COALESCE(${image}, sourceImage),
        updatedAt = NOW(3)
      WHERE id = ${id}
    `;
  } catch {
    /* isolated */
  }
}

export async function listAssignableStaff() {
  try {
    return await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "STAFF"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, image: true },
      take: 500,
    });
  } catch {
    return [];
  }
}
