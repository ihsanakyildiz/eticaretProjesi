import "server-only";

import {
  customerEmailLabel,
  customerGroupLabel,
  customerSourceLabel,
  isSyntheticCustomerEmail,
  joinFullName,
  parseCustomerGroup,
  parseCustomerSource,
  splitFullName,
} from "@/lib/customers";
import { composeStoredPhone, digitsOnly, phoneLookupNeedles } from "@/lib/phone-number";
import { prisma } from "@/lib/prisma";
import {
  isSupportChatChannel,
  supportChatChannelLabel,
  supportChatPersonKey,
  type SupportChatChannel,
  type SupportChatCustomerProfile,
} from "@/modules/support-chat/kinds";

type ChatIdentity = {
  conversationId: string;
  channel: SupportChatChannel;
  externalThreadId: string;
  customerName: string;
  customerHandle: string | null;
  customerAvatar: string | null;
  customerEmail?: string | null;
  memberUserId?: string | null;
};

type MemberRow = {
  id: string;
  supportIdentity: string | null;
  phone: string | null;
  image: string | null;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  customerSource: string | null;
  password: string | null;
  email: string;
};

function chatIdentityKey(input: ChatIdentity): string {
  return supportChatPersonKey({
    id: input.externalThreadId || input.conversationId,
    channel: input.channel,
    customerName: input.customerName,
    customerHandle: input.customerHandle,
  }).slice(0, 191);
}

function phoneHandleForChannel(channel: SupportChatChannel, handle: string | null): string | null {
  const raw = handle?.trim() || null;
  if (!raw) return null;
  switch (channel) {
    case "WHATSAPP":
      return raw;
    case "TELEGRAM":
    case "WEB":
    case "TIKTOK": {
      const digits = digitsOnly(raw);
      return digits.length >= 10 && digits.length <= 15 ? raw : null;
    }
    case "FACEBOOK_MESSENGER":
    case "FACEBOOK_POST":
    case "INSTAGRAM_DM":
    case "INSTAGRAM_POST":
      return null;
    default: {
      const _exhaustive: never = channel;
      return _exhaustive;
    }
  }
}

function phoneMatches(stored: string | null | undefined, needles: string[]): boolean {
  if (!stored || needles.length === 0) return false;
  const digits = digitsOnly(stored);
  if (digits.length < 7) return false;
  return needles.some(
    (needle) => digits === needle || digits.endsWith(needle) || needle.endsWith(digits.slice(-10)),
  );
}

async function findMemberByPhone(handle: string | null): Promise<MemberRow | null> {
  const needles = handle ? phoneLookupNeedles(handle) : [];
  if (needles.length === 0) return null;
  const last10 = needles.find((needle) => needle.length === 10) ?? needles[0] ?? "";
  if (!last10) return null;
  const like = `%${last10}%`;
  const rows = await prisma.$queryRaw<
    Array<MemberRow & { addressPhone: string | null }>
  >`
    SELECT
      u.id,
      u.supportIdentity,
      u.phone,
      u.image,
      u.firstName,
      u.lastName,
      u.name,
      u.customerSource,
      u.password,
      u.email,
      a.phone AS addressPhone
    FROM users u
    LEFT JOIN customer_addresses a ON a.userId = u.id
    WHERE u.role = 'MEMBER'
      AND (
        u.phone LIKE ${like}
        OR a.phone LIKE ${like}
      )
    LIMIT 40
  `;
  const byId = new Map<string, MemberRow & { addressPhones: string[] }>();
  for (const row of rows) {
    const current = byId.get(row.id);
    if (current) {
      if (row.addressPhone) current.addressPhones.push(row.addressPhone);
      continue;
    }
    byId.set(row.id, {
      id: row.id,
      supportIdentity: row.supportIdentity,
      phone: row.phone,
      image: row.image,
      firstName: row.firstName,
      lastName: row.lastName,
      name: row.name,
      customerSource: row.customerSource,
      password: row.password,
      email: row.email,
      addressPhones: row.addressPhone ? [row.addressPhone] : [],
    });
  }
  for (const user of byId.values()) {
    if (
      phoneMatches(user.phone, needles) ||
      user.addressPhones.some((phone) => phoneMatches(phone, needles))
    ) {
      return user;
    }
  }
  return null;
}

async function findMemberByIdentity(identity: string): Promise<MemberRow | null> {
  const rows = await prisma.$queryRaw<MemberRow[]>`
    SELECT id, supportIdentity, phone, image, firstName, lastName, name, customerSource, password, email
    FROM users
    WHERE supportIdentity = ${identity}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function findMemberById(id: string): Promise<MemberRow | null> {
  const userId = id.trim();
  if (!userId) return null;
  const rows = await prisma.$queryRaw<MemberRow[]>`
    SELECT id, supportIdentity, phone, image, firstName, lastName, name, customerSource, password, email
    FROM users
    WHERE id = ${userId} AND role = 'MEMBER'
    LIMIT 1
  `;
  return rows[0] ?? null;
}

function normalizeChatEmail(value: string | null | undefined): string | null {
  const email = value?.trim().toLowerCase() ?? "";
  if (!email || !email.includes("@") || email.length < 5 || email.length > 191) return null;
  if (isSyntheticCustomerEmail(email)) return null;
  return email;
}

async function findMemberByEmail(email: string | null): Promise<MemberRow | null> {
  if (!email) return null;
  const rows = await prisma.$queryRaw<MemberRow[]>`
    SELECT id, supportIdentity, phone, image, firstName, lastName, name, customerSource, password, email
    FROM users
    WHERE email = ${email} AND role = 'MEMBER'
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function resolveProfileEmail(preferred: string | null, identity: string) {
  if (preferred) {
    const taken = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM users WHERE email = ${preferred} LIMIT 1
    `;
    if (!taken[0]) return preferred;
  }
  return uniqueSyntheticEmail(identity);
}

function syntheticEmail(identity: string): string {
  const slug = identity
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 64);
  return `chat.${slug || "musteri"}@sohbet.local`;
}

async function uniqueSyntheticEmail(identity: string) {
  const base = syntheticEmail(identity);
  const taken = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM users WHERE email = ${base} LIMIT 1
  `;
  if (!taken[0]) return base;
  const suffix = crypto.randomUUID().slice(0, 8);
  return `chat.${identity.slice(0, 40).replace(/[^a-z0-9]+/gi, ".")}.${suffix}@sohbet.local`.toLowerCase();
}

async function nextMemberCustomerNo() {
  const rows = await prisma.$queryRaw<Array<{ nextNo: bigint | number }>>`
    SELECT COALESCE(MAX(customerNo), 0) + 1 AS nextNo FROM users
  `;
  return Number(rows[0]?.nextNo ?? 1);
}

async function linkConversation(conversationId: string, userId: string) {
  await prisma.$executeRaw`
    UPDATE support_chat_conversations
    SET customerUserId = ${userId}, updatedAt = NOW(3)
    WHERE id = ${conversationId}
  `;
}

async function absorbSupportChatUser(sourceId: string, targetId: string) {
  if (sourceId === targetId) return;
  await prisma.$executeRaw`
    UPDATE support_chat_conversations
    SET customerUserId = ${targetId}, updatedAt = NOW(3)
    WHERE customerUserId = ${sourceId}
  `;
  await prisma.$executeRaw`
    UPDATE users SET supportIdentity = NULL, updatedAt = NOW(3) WHERE id = ${sourceId}
  `;
  const rows = await prisma.$queryRaw<
    Array<{ customerSource: string | null; password: string | null; email: string; orderCount: bigint | number }>
  >`
    SELECT
      u.customerSource,
      u.password,
      u.email,
      (SELECT COUNT(*) FROM orders o WHERE o.userId = u.id) AS orderCount
    FROM users u
    WHERE u.id = ${sourceId}
    LIMIT 1
  `;
  const source = rows[0];
  if (
    source &&
    source.customerSource === "SUPPORT_CHAT" &&
    Number(source.orderCount) === 0 &&
    !source.password &&
    isSyntheticCustomerEmail(source.email)
  ) {
    await prisma.$executeRaw`DELETE FROM users WHERE id = ${sourceId}`.catch(() => undefined);
  }
}

async function applyChatProfile(
  userId: string,
  input: ChatIdentity,
  identity: string,
  existing: MemberRow,
) {
  const holder = await findMemberByIdentity(identity);
  if (holder && holder.id !== userId) {
    await absorbSupportChatUser(holder.id, userId);
  }
  const names = splitFullName(input.customerName);
  const storedPhone = composeStoredPhone(phoneHandleForChannel(input.channel, input.customerHandle) ?? "");
  const nextIdentity = existing.supportIdentity && existing.supportIdentity !== identity
    ? existing.supportIdentity
    : identity;
  const nextPhone = existing.phone || storedPhone;
  const nextImage = existing.image || input.customerAvatar;
  const fillName = !existing.firstName && Boolean(names.firstName);
  const nextFirst = fillName ? names.firstName : existing.firstName;
  const nextLast = fillName ? names.lastName || existing.lastName : existing.lastName;
  const nextName = fillName
    ? joinFullName(names.firstName, names.lastName || existing.lastName || "") ?? existing.name
    : existing.name;
  await prisma.$executeRaw`
    UPDATE users
    SET
      supportChannel = ${input.channel},
      supportIdentity = ${nextIdentity},
      phone = ${nextPhone},
      image = ${nextImage},
      firstName = ${nextFirst},
      lastName = ${nextLast},
      name = ${nextName},
      updatedAt = NOW(3)
    WHERE id = ${userId}
  `;
  await linkConversation(input.conversationId, userId);
}

export async function linkSupportChatCustomer(input: ChatIdentity): Promise<string | null> {
  try {
    const identity = chatIdentityKey(input);
    const phoneHandle = phoneHandleForChannel(input.channel, input.customerHandle);
    const chatEmail = normalizeChatEmail(input.customerEmail ?? input.customerHandle);
    const [byMember, byPhone, byEmail, byIdentity] = await Promise.all([
      input.memberUserId ? findMemberById(input.memberUserId) : Promise.resolve(null),
      findMemberByPhone(phoneHandle),
      findMemberByEmail(chatEmail),
      findMemberByIdentity(identity),
    ]);

    const preferred = byMember ?? byPhone ?? byEmail ?? byIdentity;
    const extras = [byMember, byPhone, byEmail, byIdentity].filter(
      (row): row is MemberRow => Boolean(row && preferred && row.id !== preferred.id),
    );
    if (preferred) {
      for (const extra of extras) {
        await absorbSupportChatUser(extra.id, preferred.id);
      }
      await applyChatProfile(preferred.id, input, identity, {
        ...preferred,
        supportIdentity: preferred.supportIdentity ?? identity,
        email: preferred.email,
      });
      return preferred.id;
    }

    const names = splitFullName(input.customerName);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const raced = await findMemberByIdentity(identity);
      if (raced) {
        await applyChatProfile(raced.id, input, identity, raced);
        return raced.id;
      }
      const userId = crypto.randomUUID();
      const customerNo = await nextMemberCustomerNo();
      const email = await resolveProfileEmail(chatEmail, identity);
      try {
        await prisma.$executeRaw`
          INSERT INTO users
            (id, customerNo, email, firstName, lastName, name, phone, image, role, title, customerGroup,
             customerSource, supportChannel, supportIdentity, isActive, newsletter, partnerOffers, createdAt, updatedAt)
          VALUES
            (${userId}, ${customerNo}, ${email}, ${names.firstName || null}, ${names.lastName || null},
             ${joinFullName(names.firstName, names.lastName) ?? input.customerName},
             ${composeStoredPhone(phoneHandle ?? "")}, ${input.customerAvatar}, 'MEMBER', 'MR', 'GUEST',
             'SUPPORT_CHAT', ${input.channel}, ${identity}, 1, 0, 0, NOW(3), NOW(3))
        `;
        await linkConversation(input.conversationId, userId);
        return userId;
      } catch {
        const existingAfterRace = await findMemberByIdentity(identity);
        if (existingAfterRace) {
          await linkConversation(input.conversationId, existingAfterRace.id);
          return existingAfterRace.id;
        }
      }
    }
    return null;
  } catch (error) {
    const identity = chatIdentityKey(input);
    const existing = await findMemberByIdentity(identity).catch(() => null);
    if (existing) {
      await linkConversation(input.conversationId, existing.id);
      return existing.id;
    }
    console.warn(
      "support-chat: customer profile failed",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

let backfillInFlight: Promise<number> | null = null;

export function startSupportChatCustomerBackfill() {
  if (backfillInFlight) return;
  backfillInFlight = backfillSupportChatCustomers().finally(() => {
    backfillInFlight = null;
  });
}

export async function backfillSupportChatCustomers(_limit = 40) {
  try {
    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        channel: string;
        externalThreadId: string;
        customerName: string;
        customerHandle: string | null;
        customerAvatar: string | null;
      }>
    >`
      SELECT id, channel, externalThreadId, customerName, customerHandle, customerAvatar
      FROM support_chat_conversations
      WHERE customerUserId IS NULL
      ORDER BY lastMessageAt DESC
      LIMIT 40
    `;
    let linked = 0;
    for (const row of rows) {
      if (!isSupportChatChannel(row.channel)) continue;
      const userId = await linkSupportChatCustomer({
        conversationId: row.id,
        channel: row.channel,
        externalThreadId: row.externalThreadId,
        customerName: row.customerName,
        customerHandle: row.customerHandle,
        customerAvatar: row.customerAvatar,
      });
      if (userId) linked += 1;
    }
    return linked;
  } catch (error) {
    console.warn(
      "support-chat: customer backfill failed",
      error instanceof Error ? error.message : error,
    );
    return 0;
  }
}

export async function getSupportChatCustomerProfile(
  conversationId: string,
): Promise<SupportChatCustomerProfile | null> {
  const id = conversationId.trim();
  if (!id) return null;
  const conversations = await prisma.$queryRaw<
    Array<{
      id: string;
      channel: string;
      externalThreadId: string;
      customerName: string;
      customerHandle: string | null;
      customerAvatar: string | null;
      customerUserId: string | null;
    }>
  >`
    SELECT id, channel, externalThreadId, customerName, customerHandle, customerAvatar, customerUserId
    FROM support_chat_conversations
    WHERE id = ${id}
    LIMIT 1
  `;
  const conversation = conversations[0];
  if (!conversation || !isSupportChatChannel(conversation.channel)) return null;

  let userId = conversation.customerUserId;
  if (!userId) {
    userId = await linkSupportChatCustomer({
      conversationId: conversation.id,
      channel: conversation.channel,
      externalThreadId: conversation.externalThreadId,
      customerName: conversation.customerName,
      customerHandle: conversation.customerHandle,
      customerAvatar: conversation.customerAvatar,
    });
  }

  const fallback: SupportChatCustomerProfile = {
    conversationId: conversation.id,
    customerUserId: userId,
    customerNo: null,
    name: conversation.customerName,
    email: "—",
    phone: "",
    handle: conversation.customerHandle,
    avatar: conversation.customerAvatar,
    sourceLabel: "Destek sohbeti",
    channelLabel: supportChatChannelLabel(conversation.channel),
    groupLabel: "—",
    isActive: null,
    orderCount: 0,
    chatCount: 0,
    addressCount: 0,
    createdAt: null,
    notes: null,
  };

  if (!userId) return fallback;

  const users = await prisma.$queryRaw<
    Array<{
      id: string;
      customerNo: number;
      name: string | null;
      firstName: string | null;
      lastName: string | null;
      email: string;
      phone: string | null;
      customerSource: string | null;
      supportChannel: string | null;
      customerGroup: string;
      isActive: number | boolean;
      notes: string | null;
      image: string | null;
      createdAt: Date;
      orderCount: bigint | number;
      chatCount: bigint | number;
      addressCount: bigint | number;
    }>
  >`
    SELECT
      u.id,
      u.customerNo,
      u.name,
      u.firstName,
      u.lastName,
      u.email,
      u.phone,
      u.customerSource,
      u.supportChannel,
      u.customerGroup,
      u.isActive,
      u.notes,
      u.image,
      u.createdAt,
      (SELECT COUNT(*) FROM orders o WHERE o.userId = u.id) AS orderCount,
      (SELECT COUNT(*) FROM support_chat_conversations c WHERE c.customerUserId = u.id) AS chatCount,
      (SELECT COUNT(*) FROM customer_addresses a WHERE a.userId = u.id) AS addressCount
    FROM users u
    WHERE u.id = ${userId}
    LIMIT 1
  `;
  const user = users[0];
  if (!user) return { ...fallback, customerUserId: userId };

  const fromName = splitFullName(user.name);
  const name =
    [user.firstName?.trim() || fromName.firstName, user.lastName?.trim() || fromName.lastName]
      .filter(Boolean)
      .join(" ") ||
    conversation.customerName;
  const channel =
    user.supportChannel && isSupportChatChannel(user.supportChannel)
      ? user.supportChannel
      : conversation.channel;

  return {
    conversationId: conversation.id,
    customerUserId: user.id,
    customerNo: Number(user.customerNo),
    name,
    email: customerEmailLabel(user.email),
    phone: user.phone?.trim() ?? "",
    handle: conversation.customerHandle,
    avatar: user.image || conversation.customerAvatar,
    sourceLabel: customerSourceLabel(parseCustomerSource(user.customerSource)),
    channelLabel: supportChatChannelLabel(channel),
    groupLabel: customerGroupLabel(parseCustomerGroup(user.customerGroup)),
    isActive: Boolean(user.isActive),
    orderCount: Number(user.orderCount),
    chatCount: Number(user.chatCount),
    addressCount: Number(user.addressCount),
    createdAt: user.createdAt.toISOString(),
    notes: user.notes?.trim() || null,
  };
}
