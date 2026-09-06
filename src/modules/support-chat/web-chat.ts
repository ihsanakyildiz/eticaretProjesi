import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { isSyntheticCustomerEmail, joinFullName } from "@/lib/customers";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/request-ip";
import { getSettingsMap } from "@/lib/settings";
import { parseSupportChatAutoReplies, supportChatWidgetPresence } from "@/modules/support-chat/auto-replies";
import { maybeSendSupportChatAutoReply } from "@/modules/support-chat/auto-replies-send";
import {
  ingestSupportChatMessage,
  listActiveSupportChatAccounts,
  listSupportChatMessages,
  upsertSupportChatAccount,
} from "@/modules/support-chat/db";
import {
  isSafeSupportChatMediaSrc,
  supportChatKindFromFile,
  type SupportChatMediaItem,
  type SupportChatMessageRow,
} from "@/modules/support-chat/kinds";
import { isSupportChatLicensed } from "@/modules/support-chat/license";
import { saveSupportChatMediaFile, toSupportChatMediaItem } from "@/modules/support-chat/media";
import {
  parseWebChatAppearance,
  WEB_CHAT_APPEARANCE_DEFAULTS,
  type WebChatAppearance,
} from "@/modules/support-chat/web-chat-appearance";
import { loadWebChatAppearance } from "@/modules/support-chat/web-chat-settings";
import { formatSupportChatWorkingHours, parseSupportChatWorkingHours } from "@/modules/support-chat/working-hours";

export const WEB_CHAT_ACCOUNT_EXTERNAL_ID = "site-web";
const VISITOR_COOKIE = "sc_web";
const VISITOR_MAX_AGE = 60 * 60 * 24 * 180;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type WebChatPublicMedia = {
  kind: SupportChatMediaItem["kind"];
  src: string;
  fileName: string;
  mime: string;
};

export type WebChatPublicMessage = {
  id: string;
  direction: "IN" | "OUT";
  body: string;
  sentAt: string;
  media: WebChatPublicMedia[];
};

export type WebChatKnownCustomer = {
  id: string | null;
  name: string;
  email: string;
  phone: string;
  loggedIn: boolean;
  known: boolean;
};

export type WebChatSession = {
  enabled: boolean;
  visitorId: string;
  name: string;
  email: string;
  phone: string;
  loggedIn: boolean;
  known: boolean;
  askContact: boolean;
  siteName: string;
  hours: string;
  online: boolean;
  greeting: string;
  teaserEnabled: boolean;
  teaserText: string;
  showAgentName: boolean;
  icon: WebChatAppearance["icon"];
  position: WebChatAppearance["position"];
  attachmentsEnabled: boolean;
  hasConversation: boolean;
  unread: number;
};

type RateBucket = { count: number; resetAt: number };
const rateBuckets = new Map<string, RateBucket>();

function visitorSecret() {
  return process.env.AUTH_SECRET || process.env.MODULE_LICENSE_SECRET || "support-web-chat";
}

function signVisitorId(id: string) {
  return createHmac("sha256", visitorSecret()).update(id).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function parseVisitorCookie(raw: string | undefined): string | null {
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot < 1) return null;
  const id = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!UUID_RE.test(id) || !sig) return null;
  if (!safeEqual(signVisitorId(id), sig)) return null;
  return id;
}

function takeRateToken(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  if (rateBuckets.size > 4000) {
    for (const [id, bucket] of rateBuckets) {
      if (bucket.resetAt <= now) rateBuckets.delete(id);
    }
  }
  const current = rateBuckets.get(key);
  if (!current || current.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 80);
}

function normalizeEmail(value: string) {
  const email = value.trim().toLowerCase();
  if (!email) return "";
  if (!EMAIL_RE.test(email) || email.length > 191) return null;
  return email;
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length < 10 || digits.length > 15) return null;
  return value.trim().slice(0, 32);
}

const emptyKnownCustomer: WebChatKnownCustomer = {
  id: null,
  name: "",
  email: "",
  phone: "",
  loggedIn: false,
  known: false,
};

function isGenericChatName(value: string) {
  switch (value.trim().toLocaleLowerCase("tr-TR")) {
    case "":
    case "admin":
    case "administrator":
    case "root":
    case "staff":
    case "yonetici":
    case "yönetici":
    case "temsilci":
    case "musteri":
    case "müşteri":
      return true;
    default:
      return false;
  }
}

function pickPersonName(...candidates: Array<string | null | undefined>) {
  const usable = candidates
    .map((value) => value?.trim() || "")
    .filter((value) => value.length >= 2 && !isGenericChatName(value));
  return usable.sort((left, right) => right.length - left.length)[0] ?? "";
}

function asKnownCustomer(input: {
  id: string;
  name: string;
  email: string;
  phone: string;
}): WebChatKnownCustomer {
  const name = pickPersonName(input.name);
  const email =
    input.email && !isSyntheticCustomerEmail(input.email) && EMAIL_RE.test(input.email)
      ? input.email.trim()
      : "";
  const phone = input.phone.trim();
  return {
    id: input.id,
    name,
    email,
    phone,
    loggedIn: true,
    known: name.length >= 2 || Boolean(email) || phone.replace(/\D/g, "").length >= 10,
  };
}

export async function getWebChatKnownCustomer(userId?: string | null): Promise<WebChatKnownCustomer> {
  const session = await auth().catch(() => null);
  const id = userId?.trim() || session?.user?.id || "";
  if (!id) return emptyKnownCustomer;
  const fromSession = asKnownCustomer({
    id,
    name: session?.user?.name ?? "",
    email: session?.user?.email ?? "",
    phone: "",
  });
  try {
    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        name: string | null;
        firstName: string | null;
        lastName: string | null;
        email: string | null;
        phone: string | null;
      }>
    >`
      SELECT id, name, firstName, lastName, email, phone
      FROM users
      WHERE id = ${id}
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) return fromSession;
    return asKnownCustomer({
      id: row.id,
      name: pickPersonName(
        row.name,
        joinFullName(row.firstName ?? "", row.lastName ?? ""),
        fromSession.name,
      ),
      email: row.email || fromSession.email,
      phone: row.phone || "",
    });
  } catch {
    return fromSession;
  }
}

async function writeVisitorCookie(visitorId: string) {
  const store = await cookies();
  store.set(VISITOR_COOKIE, `${visitorId}.${signVisitorId(visitorId)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: VISITOR_MAX_AGE,
  });
}

async function readOrCreateVisitorId() {
  const store = await cookies();
  const existing = parseVisitorCookie(store.get(VISITOR_COOKIE)?.value);
  if (existing) return existing;
  const visitorId = crypto.randomUUID();
  await writeVisitorCookie(visitorId);
  return visitorId;
}

export async function ensureWebChatAccount() {
  const active = await listActiveSupportChatAccounts();
  const live = active.find((account) => account.channel === "WEB");
  if (live) return live;
  const rows = await prisma.$queryRaw<Array<{ id: string; status: string }>>`
    SELECT id, status FROM support_chat_accounts
    WHERE channel = 'WEB'
    ORDER BY createdAt ASC
    LIMIT 1
  `;
  if (rows[0]) return null;
  const created = await upsertSupportChatAccount({
    channel: "WEB",
    name: "Site web sohbet",
    externalId: WEB_CHAT_ACCOUNT_EXTERNAL_ID,
    credentialsJson: "{}",
  });
  if ("error" in created) return null;
  const again = await listActiveSupportChatAccounts();
  return again.find((account) => account.channel === "WEB") ?? null;
}

function threadIdFor(visitorId: string, memberUserId: string | null) {
  return memberUserId ? `web:u:${memberUserId}` : `web:v:${visitorId}`;
}

async function findWebConversation(accountId: string, threadId: string) {
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      customerName: string;
      customerHandle: string | null;
      lastMessageAt: Date | null;
    }>
  >`
    SELECT id, customerName, customerHandle, lastMessageAt
    FROM support_chat_conversations
    WHERE accountId = ${accountId} AND externalThreadId = ${threadId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function countVisitorUnread(conversationId: string, after: Date | null) {
  if (!after) {
    const rows = await prisma.$queryRaw<Array<{ total: bigint | number }>>`
      SELECT COUNT(*) AS total
      FROM support_chat_messages
      WHERE conversationId = ${conversationId} AND direction = 'OUT'
    `;
    return Number(rows[0]?.total ?? 0);
  }
  const rows = await prisma.$queryRaw<Array<{ total: bigint | number }>>`
    SELECT COUNT(*) AS total
    FROM support_chat_messages
    WHERE conversationId = ${conversationId} AND direction = 'OUT' AND sentAt > ${after}
  `;
  return Number(rows[0]?.total ?? 0);
}

function toPublicMessage(row: SupportChatMessageRow): WebChatPublicMessage {
  return {
    id: row.id,
    direction: row.direction,
    body: row.body,
    sentAt: row.sentAt,
    media: (row.media ?? []).flatMap((item) =>
      isSafeSupportChatMediaSrc(item.src)
        ? [{ kind: item.kind, src: item.src, fileName: item.fileName, mime: item.mime }]
        : [],
    ),
  };
}

export async function getWebChatSession(seenAt?: string | null): Promise<WebChatSession | { error: string }> {
  const licensed = await isSupportChatLicensed().catch(() => false);
  const [settings, customer, visitorId] = await Promise.all([
    getSettingsMap().catch(() => ({}) as Record<string, string>),
    getWebChatKnownCustomer(),
    readOrCreateVisitorId(),
  ]);
  const appearance = parseWebChatAppearance(settings);
  const siteName = settings.site_name || "Destek";
  const hours = parseSupportChatWorkingHours(settings.support_chat_working_hours);
  const autoReplies = parseSupportChatAutoReplies(settings.support_chat_auto_replies);
  const presence = supportChatWidgetPresence(hours, autoReplies);
  const hoursLabel = formatSupportChatWorkingHours(hours);
  const hoursStatus = presence.vacation
    ? { online: false, subtitle: `Tatil · ${hoursLabel}` }
    : presence.online
      ? { online: true, subtitle: hoursLabel }
      : { online: false, subtitle: `Kapalı · ${hoursLabel}` };
  const teaserText = customer.loggedIn ? appearance.teaserText : appearance.teaserGuestText;
  const empty: WebChatSession = {
    enabled: false,
    visitorId,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    loggedIn: customer.loggedIn,
    known: customer.known,
    askContact: appearance.membership && !customer.known,
    siteName,
    hours: hoursStatus.subtitle,
    online: hoursStatus.online,
    greeting: appearance.greeting,
    teaserEnabled: appearance.teaserEnabled,
    teaserText,
    showAgentName: appearance.showAgentName,
    icon: appearance.icon,
    position: appearance.position,
    attachmentsEnabled: appearance.attachmentsEnabled,
    hasConversation: false,
    unread: 0,
  };
  if (!licensed || !appearance.enabled) return empty;
  const account = await ensureWebChatAccount();
  if (!account) return empty;
  const threadId = threadIdFor(visitorId, customer.id);
  const conversation = await findWebConversation(account.id, threadId);
  if (conversation && customer.name && isGenericChatName(conversation.customerName)) {
    await prisma.$executeRaw`
      UPDATE support_chat_conversations
      SET customerName = ${customer.name}, updatedAt = NOW(3)
      WHERE id = ${conversation.id}
    `;
    conversation.customerName = customer.name;
  }
  const seen = seenAt ? new Date(seenAt) : null;
  const seenDate = seen && !Number.isNaN(seen.getTime()) ? seen : null;
  return {
    ...empty,
    enabled: true,
    name: customer.name || conversation?.customerName || "",
    email:
      customer.email ||
      (conversation?.customerHandle?.includes("@") ? conversation.customerHandle : ""),
    phone: customer.phone,
    known: customer.known || Boolean(conversation),
    askContact: appearance.membership && !customer.known && !conversation,
    hasConversation: Boolean(conversation),
    unread: conversation ? await countVisitorUnread(conversation.id, seenDate) : 0,
  };
}

export async function listWebChatMessages(): Promise<
  { ok: true; messages: WebChatPublicMessage[] } | { error: string }
> {
  const licensed = await isSupportChatLicensed().catch(() => false);
  const appearance = await loadWebChatAppearance().catch(() => WEB_CHAT_APPEARANCE_DEFAULTS);
  if (!licensed || !appearance.enabled) return { error: "Sohbet kapalı." };
  const [customer, visitorId] = await Promise.all([getWebChatKnownCustomer(), readOrCreateVisitorId()]);
  const account = await ensureWebChatAccount();
  if (!account) return { error: "Web sohbet hesabı yok." };
  const conversation = await findWebConversation(account.id, threadIdFor(visitorId, customer.id));
  if (!conversation) return { ok: true, messages: [] };
  const messages = await listSupportChatMessages(conversation.id);
  return { ok: true, messages: messages.map(toPublicMessage) };
}

export async function sendWebChatMessage(input: {
  name?: string;
  email?: string;
  phone?: string;
  body: string;
  file?: File | null;
}): Promise<{ ok: true; messages: WebChatPublicMessage[] } | { error: string }> {
  const ip = await getClientIp();
  if (!takeRateToken(`web-chat:${ip}`, 20, 60_000)) {
    return { error: "Çok hızlı yazıyorsunuz. Biraz sonra tekrar deneyin." };
  }
  const licensed = await isSupportChatLicensed().catch(() => false);
  const appearance = await loadWebChatAppearance().catch(() => WEB_CHAT_APPEARANCE_DEFAULTS);
  if (!licensed || !appearance.enabled) return { error: "Sohbet kapalı." };
  const body = input.body.trim().slice(0, 2000);
  let storedMedia: SupportChatMediaItem | null = null;
  if (input.file && input.file.size > 0) {
    if (!appearance.attachmentsEnabled) return { error: "Dosya yükleme kapalı." };
    const mime = input.file.type || "application/octet-stream";
    const kind = supportChatKindFromFile(mime, input.file.name);
    const saved = await saveSupportChatMediaFile({
      buffer: Buffer.from(await input.file.arrayBuffer()),
      mime,
      fileName: input.file.name,
      kind,
    });
    if ("error" in saved) return { error: saved.error };
    storedMedia = toSupportChatMediaItem(saved);
  }
  if (body.length < 1 && !storedMedia) return { error: "Mesaj yazın veya dosya ekleyin." };
  const name = normalizeName(input.name ?? "");
  const email = normalizeEmail(input.email ?? "");
  if (email === null) return { error: "Geçerli bir e-posta yazın." };
  const phone = normalizePhone(input.phone ?? "");
  if (phone === null) return { error: "Geçerli bir telefon yazın." };
  const [customer, visitorId] = await Promise.all([getWebChatKnownCustomer(), readOrCreateVisitorId()]);
  const displayName =
    pickPersonName(customer.name, name, (customer.email || email).split("@")[0]) || "Ziyaretçi";
  if (appearance.membership && !customer.known && displayName.length < 2) {
    return { error: "Adınızı yazın." };
  }
  const displayEmail = customer.email || email;
  const handle = customer.phone || phone || displayEmail || null;
  const account = await ensureWebChatAccount();
  if (!account) return { error: "Web sohbet hesabı yok." };
  const threadId = threadIdFor(visitorId, customer.id);
  const ingested = await ingestSupportChatMessage({
    accountId: account.id,
    channel: "WEB",
    externalThreadId: threadId,
    customerName: displayName,
    customerHandle: handle,
    customerAvatar: null,
    customerEmail: displayEmail || null,
    memberUserId: customer.id,
    body,
    direction: "IN",
    externalId: `web-in-${crypto.randomUUID()}`,
    sentAt: new Date(),
    media: storedMedia ? [storedMedia] : [],
  });
  if ("error" in ingested) return { error: "Mesaj iletilemedi." };
  if (!ingested.duplicate && ingested.conversationId) {
    await maybeSendSupportChatAutoReply(ingested.conversationId);
  }
  const conversation = await findWebConversation(account.id, threadId);
  if (!conversation) return { error: "Konuşma açılamadı." };
  const messages = await listSupportChatMessages(conversation.id);
  return { ok: true, messages: messages.map(toPublicMessage) };
}

export async function isWebChatPublicEnabled() {
  const [licensed, appearance] = await Promise.all([
    isSupportChatLicensed().catch(() => false),
    loadWebChatAppearance().catch(() => WEB_CHAT_APPEARANCE_DEFAULTS),
  ]);
  return licensed && appearance.enabled;
}
